package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"go-test/internal/middleware"
	"go-test/internal/models"

	"github.com/gorilla/websocket"
)

type MessageType string

const (
	AttendanceUpdate    MessageType = "attendance.update"
	AttendanceClockIn   MessageType = "attendance.clock_in"
	AttendanceClockOut  MessageType = "attendance.clock_out"
	AttendanceApproved  MessageType = "attendance.approved"
	LiveBoardUpdate     MessageType = "live_board.update"
	ConnectionEstablished MessageType = "connection.established"
	Error               MessageType = "error"
)

type WSMessage struct {
	Type      MessageType `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

type AttendanceUpdateData struct {
	ID          string    `json:"id"`
	EmployeeID  string    `json:"employeeId"`
	EmployeeName string   `json:"employeeName"`
	Status      string    `json:"status"`
	ClockInTime time.Time `json:"clockInTime,omitempty"`
	ClockOutTime time.Time `json:"clockOutTime,omitempty"`
	Action      string    `json:"action"` // "clock_in", "clock_out", "approved", etc
}

type Client struct {
	ID       string
	UserID   string
	Role     models.Role
	Conn     *websocket.Conn
	Manager  *Manager
	Send     chan *WSMessage
	Done     chan bool
	UserType string // "admin", "employee"
}

type Manager struct {
	Clients      map[*Client]bool
	ClientsMutex sync.RWMutex
	Register     chan *Client
	Unregister   chan *Client
	Broadcast    chan *WSMessage
	Done         chan bool
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for now - consider restricting in production
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func NewManager() *Manager {
	return &Manager{
		Clients:    make(map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan *WSMessage, 256),
		Done:       make(chan bool),
	}
}

func (m *Manager) Start(ctx context.Context) {
	go func() {
		for {
			select {
			case client := <-m.Register:
				m.ClientsMutex.Lock()
				m.Clients[client] = true
				m.ClientsMutex.Unlock()
				log.Printf("Client %s connected. Total clients: %d", client.ID, len(m.Clients))
				
				// Send connection established message
				client.Send <- &WSMessage{
					Type:      ConnectionEstablished,
					Data:      map[string]string{"message": "Connected to live board"},
					Timestamp: time.Now(),
				}

			case client := <-m.Unregister:
				m.ClientsMutex.Lock()
				if ok := m.Clients[client]; ok {
					delete(m.Clients, client)
					close(client.Send)
					m.ClientsMutex.Unlock()
					log.Printf("Client %s disconnected. Total clients: %d", client.ID, len(m.Clients))
				} else {
					m.ClientsMutex.Unlock()
				}

			case message := <-m.Broadcast:
				m.ClientsMutex.RLock()
				for client := range m.Clients {
					// Filter messages based on user role
					if m.shouldSendMessage(client, message) {
						select {
						case client.Send <- message:
						default:
							// Client's send channel is full, skip this message
						}
					}
				}
				m.ClientsMutex.RUnlock()

			case <-ctx.Done():
				return
			}
		}
	}()
}

func (m *Manager) shouldSendMessage(client *Client, message *WSMessage) bool {
	// Admins receive all messages
	if client.Role == models.RoleAdmin || client.Role == models.RoleSuperAdmin {
		return true
	}

	// Employees only receive messages related to their own attendance
	if client.Role == models.RoleEmployee {
		if data, ok := message.Data.(map[string]interface{}); ok {
			employeeID, exists := data["employeeId"]
			return exists && employeeID == client.UserID
		}
	}

	return false
}

func (c *Client) ReadPump() {
	defer func() {
		c.Manager.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, data, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("websocket error: %v", err)
			}
			break
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("Failed to unmarshal message: %v", err)
			continue
		}

		// Echo messages back for now - can implement more logic here
		_ = msg // Suppress unused variable warning
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteJSON(message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		case <-c.Done:
			return
		}
	}
}

func (m *Manager) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	client := &Client{
		ID:       generateClientID(),
		UserID:   user.ID,
		Role:     user.Role,
		Conn:     conn,
		Manager:  m,
		Send:     make(chan *WSMessage, 256),
		Done:     make(chan bool),
		UserType: string(user.Role),
	}

	m.Register <- client

	// Start read and write pumps
	go client.ReadPump()
	go client.WritePump()
}

func (m *Manager) BroadcastAttendanceUpdate(data AttendanceUpdateData) {
	message := &WSMessage{
		Type:      AttendanceUpdate,
		Data:      data,
		Timestamp: time.Now(),
	}
	select {
	case m.Broadcast <- message:
	default:
		log.Println("Broadcast channel full, dropping message")
	}
}

func (m *Manager) BroadcastLiveBoard(attendance interface{}) {
	message := &WSMessage{
		Type:      LiveBoardUpdate,
		Data:      attendance,
		Timestamp: time.Now(),
	}
	select {
	case m.Broadcast <- message:
	default:
		log.Println("Broadcast channel full, dropping message")
	}
}

func generateClientID() string {
	return time.Now().Format("20060102150405") + "-" + randString(12)
}

func randString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}
