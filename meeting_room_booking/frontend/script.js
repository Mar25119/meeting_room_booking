const API_URL = "http://127.0.0.1:8000/api";
let currentUser = null;

// === АВТОРИЗАЦИЯ ===

async function login() {
    const username = document.getElementById('username').value;
    const role = document.getElementById('role').value;
    
    if (!username) {
        alert("Введите имя");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, role })
        });
        
        currentUser = await response.json();
        
        document.getElementById('user-info').textContent = 
            `${currentUser.username} (${currentUser.role === 'admin' ? 'Админ' : 'Сотрудник'})`;
        
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        
        // Показываем админские вкладки
        if (currentUser.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.classList.remove('hidden');
            });
        }
        
        loadRooms();
        loadMyBookings();
        if (currentUser.role === 'admin') {
            loadAllBookings();
            loadAdminRooms();
        }
    } catch (error) {
        alert("Ошибка входа: " + error.message);
    }
}

// === НАВИГАЦИЯ ===

function showTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Показываем нужную
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
    
    // Загружаем данные
    if (tabName === 'rooms') loadRooms();
    if (tabName === 'my-bookings') loadMyBookings();
    if (tabName === 'all-bookings') loadAllBookings();
    if (tabName === 'admin-rooms') loadAdminRooms();
}

// === КОМНАТЫ ===

async function loadRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`);
        const rooms = await response.json();
        
        const container = document.getElementById('rooms-list');
        container.innerHTML = '';
        
        rooms.forEach(room => {
            const card = document.createElement('div');
            card.className = 'room-card';
            card.innerHTML = `
                <h3>🚪 ${room.name}</h3>
                <div class="room-info">
                    👥 Вместимость: ${room.capacity} чел.<br>
                    📋 Оборудование: ${room.equipment || 'Нет'}
                </div>
                <button onclick="openBookingModal(${room.id}, '${room.name}')">
                    Забронировать
                </button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Ошибка загрузки комнат:", error);
    }
}

async function addRoom() {
    const name = document.getElementById('new-room-name').value;
    const capacity = document.getElementById('new-room-capacity').value;
    const equipment = document.getElementById('new-room-equipment').value;
    
    if (!name || !capacity) {
        alert("Заполните название и вместимость");
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, capacity: parseInt(capacity), equipment })
        });
        
        if (response.ok) {
            alert("Комната добавлена!");
            document.getElementById('new-room-name').value = '';
            document.getElementById('new-room-capacity').value = '';
            document.getElementById('new-room-equipment').value = '';
            loadAdminRooms();
        } else {
            alert("Ошибка при добавлении комнаты");
        }
    } catch (error) {
        alert("Ошибка: " + error.message);
    }
}

async function deleteRoom(roomId) {
    if (!confirm("Удалить комнату?")) return;
    
    try {
        const response = await fetch(`${API_URL}/rooms/${roomId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert("Комната удалена");
            loadAdminRooms();
        }
    } catch (error) {
        alert("Ошибка: " + error.message);
    }
}

async function loadAdminRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`);
        const rooms = await response.json();
        
        const container = document.getElementById('admin-rooms-list');
        container.innerHTML = '<h3>Существующие комнаты</h3>';
        
        rooms.forEach(room => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <strong>${room.name}</strong> (вместимость: ${room.capacity})<br>
                <small>${room.equipment || 'Нет оборудования'}</small>
                <button onclick="deleteRoom(${room.id})" style="background:#e74c3c; margin-left:10px;">
                    Удалить
                </button>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error("Ошибка:", error);
    }
}

// === БРОНИРОВАНИЯ ===

function openBookingModal(roomId, roomName) {
    document.getElementById('booking-room-id').value = roomId;
    document.getElementById('modal-room-name').textContent = `Комната: ${roomName}`;
    document.getElementById('booking-modal').classList.remove('hidden');
    
    // Устанавливаем минимальную дату (сегодня)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('booking-date').min = today;
}

function closeModal() {
    document.getElementById('booking-modal').classList.add('hidden');
}

async function confirmBooking() {
    const roomId = document.getElementById('booking-room-id').value;
    const date = document.getElementById('booking-date').value;
    const timeStart = document.getElementById('booking-time-start').value;
    const timeEnd = document.getElementById('booking-time-end').value;
    const purpose = document.getElementById('booking-purpose').value;
    
    if (!date || !timeStart || !timeEnd) {
        alert("Заполните дату и время");
        return;
    }
    
    if (timeStart >= timeEnd) {
        alert("Время начала должно быть раньше времени окончания");
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                room_id: parseInt(roomId),
                user_name: currentUser.username,
                date,
                time_start: timeStart,
                time_end: timeEnd,
                purpose: purpose || 'Встреча'
            })
        });
        
        if (response.ok) {
            alert("Комната забронирована!");
            closeModal();
            loadMyBookings();
            // Очищаем форму
            document.getElementById('booking-date').value = '';
            document.getElementById('booking-time-start').value = '';
            document.getElementById('booking-time-end').value = '';
            document.getElementById('booking-purpose').value = '';
        } else {
            const error = await response.json();
            alert(error.detail || "Ошибка бронирования");
        }
    } catch (error) {
        alert("Ошибка: " + error.message);
    }
}

async function loadMyBookings() {
    try {
        const response = await fetch(`${API_URL}/bookings`);
        const allBookings = await response.json();
        
        // Фильтруем только мои бронирования
        const myBookings = allBookings.filter(b => b.user_name === currentUser.username);
        
        // Загружаем информацию о комнатах
        const roomsResponse = await fetch(`${API_URL}/rooms`);
        const rooms = await roomsResponse.json();
        
        const container = document.getElementById('my-bookings-list');
        container.innerHTML = '';
        
        if (myBookings.length === 0) {
            container.innerHTML = '<p>У вас нет бронирований</p>';
            return;
        }
        
        myBookings.forEach(booking => {
            const room = rooms.find(r => r.id === booking.room_id);
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.innerHTML = `
                <h4>🚪 ${room ? room.name : 'Комната #' + booking.room_id}</h4>
                <div class="booking-info">
                    📅 ${formatDate(booking.date)}<br>
                    ⏰ ${booking.time_start} - ${booking.time_end}<br>
                    📋 ${booking.purpose}
                </div>
                <button onclick="cancelBooking(${booking.id})">Отменить</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Ошибка:", error);
    }
}

async function loadAllBookings() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const response = await fetch(`${API_URL}/bookings`);
        const bookings = await response.json();
        
        const roomsResponse = await fetch(`${API_URL}/rooms`);
        const rooms = await roomsResponse.json();
        
        const container = document.getElementById('all-bookings-list');
        container.innerHTML = '';
        
        if (bookings.length === 0) {
            container.innerHTML = '<p>Нет бронирований</p>';
            return;
        }
        
        bookings.forEach(booking => {
            const room = rooms.find(r => r.id === booking.room_id);
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.innerHTML = `
                <h4>🚪 ${room ? room.name : 'Комната #' + booking.room_id}</h4>
                <div class="booking-info">
                    👤 ${booking.user_name}<br>
                    📅 ${formatDate(booking.date)}<br>
                    ⏰ ${booking.time_start} - ${booking.time_end}<br>
                    📋 ${booking.purpose}
                </div>
                <button onclick="cancelBooking(${booking.id})">Удалить</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Ошибка:", error);
    }
}

async function cancelBooking(bookingId) {
    if (!confirm("Отменить бронирование?")) return;
    
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert("Бронирование отменено");
            loadMyBookings();
            if (currentUser.role === 'admin') {
                loadAllBookings();
            }
        } else {
            alert("Ошибка при отмене");
        }
    } catch (error) {
        alert("Ошибка: " + error.message);
    }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('booking-modal');
    if (event.target === modal) {
        closeModal();
    }
}