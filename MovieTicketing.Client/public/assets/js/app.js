const SEAT_PRICE = 250; // PHP per seat

const app = {
    movies: [],
    allMovies: [], // Store all movies for filtering
    selectedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    dateOffset: 0,
    currentMainTab: 'now_showing',
    currentMovie: null,
    currentShowtime: null,
    selectedSeatIds: new Set(),

    switchMainTab(tabId, btn) {
        this.currentMainTab = tabId;

        // Update active class on buttons
        const tabsContainer = btn.closest('.main-tabs');
        tabsContainer.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        // Update tab indicator
        const indicator = document.getElementById('main-tab-indicator');
        indicator.style.left = btn.offsetLeft + 'px';
        indicator.style.width = btn.offsetWidth + 'px';

        // Toggle content containers
        document.getElementById('tab-content-now-showing').style.display = (tabId === 'now_showing') ? 'block' : 'none';
        document.getElementById('tab-content-coming-soon').style.display = (tabId === 'coming_soon') ? 'block' : 'none';
    },

    init() {
        this.fetchMovies();

        // Payment method toggle — show/hide reference field
        document.querySelectorAll('input[name="pay_method"]').forEach(radio => {
            radio.addEventListener('change', () => this.updatePayRefLabel());
        });

        // Initialize main tab indicator
        setTimeout(() => {
            const activeTab = document.querySelector('.main-tab.active');
            if (activeTab) {
                const indicator = document.getElementById('main-tab-indicator');
                if (indicator) {
                    indicator.style.left = activeTab.offsetLeft + 'px';
                    indicator.style.width = activeTab.offsetWidth + 'px';
                }
            }
        }, 100);
    },

    renderDatePicker() {
        const container = document.getElementById('date-picker-list');
        if (!container) return;
        container.innerHTML = '';
        
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + this.dateOffset);
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(baseDate);
            date.setDate(baseDate.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const isTodayDate = date.toDateString() === today.toDateString();
            const dayName = isTodayDate && this.dateOffset === 0 ? 'TODAY' : date.toLocaleDateString('en-PH', { weekday: 'short' });
            const dayNum = date.getDate();
            const monthName = date.toLocaleDateString('en-PH', { month: 'short' });

            // Check if there are movies on this date
            const hasMovies = this.allMovies.some(m => m.status === 'now_showing' && m.showtimes && m.showtimes.some(st => st.show_time.split(' ')[0] === dateStr));

            const el = document.createElement('div');
            el.dataset.date = dateStr;
            el.className = `date-item ${this.selectedDate === dateStr ? 'active' : ''}`;
            if (!hasMovies && this.selectedDate !== dateStr) el.classList.add('dimmed');
            
            el.innerHTML = `
                <span class="day-name">${dayName}</span>
                <span class="day-number">${dayNum}</span>
                <span class="month-name">${monthName}</span>
            `;
            el.onclick = () => this.selectDate(dateStr, el);
            container.appendChild(el);
        }

        const maxDate = new Date('2030-12-31');
        const prevBtn = document.getElementById('cal-prev');
        const nextBtn = document.getElementById('cal-next');
        if (prevBtn) prevBtn.disabled = this.dateOffset <= 0;
        if (nextBtn) nextBtn.disabled = baseDate >= maxDate;
    },

    shiftDates(direction) {
        this.dateOffset += direction;
        if (this.dateOffset < 0) this.dateOffset = 0;
        this.renderDatePicker();
    },

    selectDate(dateStr, el) {
        this.selectedDate = dateStr;
        document.querySelectorAll('.date-item').forEach(item => {
            item.classList.remove('active');
            const dStr = item.dataset.date;
            const hasMovies = this.allMovies.some(m => m.status === 'now_showing' && m.showtimes && m.showtimes.some(st => st.show_time.split(' ')[0] === dStr));
            if (!hasMovies && this.selectedDate !== dStr) item.classList.add('dimmed');
            else item.classList.remove('dimmed');
        });
        el.classList.add('active');
        el.classList.remove('dimmed');
        this.renderMovies();
    },

    async fetchMovies() {
        try {
            const res = await fetch('api.php?action=movies');
            const data = await res.json();
            if (data.success) {
                this.allMovies = data.data;
                this.renderDatePicker();
                this.renderMovies();
            } else {
                this.showToast('Failed to load movies', 'error');
            }
        } catch (error) {
            this.showToast('Network error loading movies', 'error');
        }
    },

    renderMovies() {
        const nowShowingContainer = document.getElementById('movie-list');
        const comingSoonContainer = document.getElementById('coming-soon-list');
        
        // --- 1. Filter and Render "Now Showing" Movies ---
        const nowShowingMovies = this.allMovies.filter(movie => {
            if (movie.status !== 'now_showing') return false;
            return movie.showtimes && movie.showtimes.some(st => st.show_time.split(' ')[0] === this.selectedDate);
        });

        nowShowingContainer.innerHTML = '';
        if (nowShowingMovies.length === 0) {
            nowShowingContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8;">
                    <p style="font-size: 1.2rem;">No movies available for this date. 🎬</p>
                </div>
            `;
        } else {
            nowShowingMovies.forEach(movie => {
                const el = document.createElement('div');
                el.className = 'movie-card';
                el.innerHTML = `
                    <img src="${movie.poster_url}" alt="${movie.title}" class="movie-poster">
                    <div class="movie-info">
                        <h3>${movie.title}</h3>
                        <p>${movie.duration_minutes} mins</p>
                    </div>
                `;
                el.onclick = () => this.selectMovie(movie);
                nowShowingContainer.appendChild(el);
            });
        }

        // --- 2. Filter and Render "Coming Soon" Movies ---
        if (comingSoonContainer) {
            const comingSoonMovies = this.allMovies.filter(movie => movie.status === 'coming_soon');
            
            comingSoonContainer.innerHTML = '';
            if (comingSoonMovies.length === 0) {
                comingSoonContainer.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8;">
                        <p style="font-size: 1.2rem;">No upcoming movies at the moment. 🎬</p>
                    </div>
                `;
            } else {
                comingSoonMovies.forEach(movie => {
                    const el = document.createElement('div');
                    el.className = 'movie-card';
                    el.innerHTML = `
                        <img src="${movie.poster_url}" alt="${movie.title}" class="movie-poster">
                        <div class="movie-info">
                            <h3>${movie.title}</h3>
                            <p>${movie.duration_minutes} mins</p>
                        </div>
                    `;
                    el.onclick = () => this.selectMovie(movie);
                    comingSoonContainer.appendChild(el);
                });
            }
        }
    },

    selectMovie(movie) {
        this.currentMovie = movie;
        
        // Populate Movie Details
        document.getElementById('detail-poster').src = movie.poster_url;
        document.getElementById('detail-title').textContent = movie.title;
        
        const metaPieces = [
            `${movie.duration_minutes} mins`,
            movie.genre || 'Genre: TBA',
            `Dir: ${movie.director || 'TBA'}`
        ].filter(Boolean);
        document.getElementById('detail-meta').innerHTML = metaPieces.map(p => `<span>${p}</span>`).join(' &nbsp;&bull;&nbsp; ');
        
        document.getElementById('detail-desc').textContent = movie.description || 'No description available.';
        
        const castEl = document.getElementById('detail-cast');
        castEl.style.display = 'block';
        castEl.innerHTML = `<strong>Cast:</strong> <span>${movie.cast || 'To be announced'}</span>`;
        
        const trailerContainer = document.querySelector('.movie-trailer-container');
        const trailerEl = document.getElementById('detail-trailer');
        if (movie.trailer_url) {
            trailerContainer.style.display = 'block';
            let videoId = null;
            try {
                const urlObj = new URL(movie.trailer_url);
                if (urlObj.hostname.includes('youtube.com')) {
                    if (urlObj.pathname.includes('/watch')) {
                        videoId = urlObj.searchParams.get('v');
                    } else if (urlObj.pathname.includes('/embed/')) {
                        videoId = urlObj.pathname.split('/').pop();
                    }
                } else if (urlObj.hostname.includes('youtu.be')) {
                    videoId = urlObj.pathname.substring(1);
                }
            } catch(e) {}
            
            if (videoId) {
                // Autoplay=1 starts the video automatically upon navigating to the details
                trailerEl.src = `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1`;
            } else {
                trailerEl.src = movie.trailer_url; // fallback
            }
        } else {
            trailerContainer.style.display = 'none';
            trailerEl.src = '';
        }
        
        // Showtimes functionality
        const container = document.getElementById('showtime-list');
        container.innerHTML = '';
        
        // Filter showtimes for the selected date
        let filteredShowtimes = [];
        if (movie.status === 'now_showing') {
            filteredShowtimes = movie.showtimes.filter(st => st.show_time.split(' ')[0] === this.selectedDate);
            if (filteredShowtimes.length === 0) {
                container.innerHTML = '<p>No showtimes available for this date.</p>';
            }
        } else {
            filteredShowtimes = movie.showtimes || [];
            if (filteredShowtimes.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8;">Schedules to be announced soon.</p>';
            }
        }

        if (filteredShowtimes.length > 0) {
            filteredShowtimes.forEach(st => {
                const el = document.createElement('div');
                el.className = 'showtime-card';
                const dateObj = new Date(st.show_time);
                el.textContent = dateObj.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                el.onclick = () => this.selectShowtime(st);
                container.appendChild(el);
            });
        }
        
        this.switchSection(2);
    },

    async selectShowtime(showtime) {
        if (typeof IS_LOGGED_IN !== 'undefined' && !IS_LOGGED_IN) {
            alert("Please log in or create an account to continue with reservation.");
            window.location.href = 'login.php';
            return;
        }

        this.currentShowtime = showtime;
        this.selectedSeatIds.clear();
        this.updateSelectionCount();
        
        try {
            const res = await fetch(`api.php?action=seats&showtime_id=${showtime.id}`);
            const data = await res.json();
            if (data.success) {
                this.renderSeats(data.data);
                this.switchSection(3);
                
                const availableCount = data.data.filter(s => s.status === 'available').length;
                document.getElementById('remaining-seats-badge').textContent = `${availableCount} Seats Available`;
            }
        } catch (error) {
            this.showToast('Failed to load seats', 'error');
        }
    },

    renderSeats(seats) {
        const container = document.getElementById('seat-map');
        container.innerHTML = '';
        
        let currentRow = '';
        
        seats.forEach(seat => {
            if (seat.seat_row !== currentRow) {
                currentRow = seat.seat_row;
                const rowLabel = document.createElement('div');
                rowLabel.className = 'seat-row-label';
                rowLabel.textContent = `Row ${currentRow}`;
                container.appendChild(rowLabel);
            }

            const el = document.createElement('div');
            el.className = `seat ${seat.status}`;
            el.textContent = seat.seat_col;
            
            if (seat.status === 'available') {
                el.onclick = () => this.toggleSeat(seat.id, el);
            }
            
            container.appendChild(el);
        });
    },

    toggleSeat(seatId, el) {
        if (this.selectedSeatIds.has(seatId)) {
            this.selectedSeatIds.delete(seatId);
            el.classList.remove('selected');
        } else {
            this.selectedSeatIds.add(seatId);
            el.classList.add('selected');
        }
        this.updateSelectionCount();
    },

    updateSelectionCount() {
        const count = this.selectedSeatIds.size;
        const total = count * SEAT_PRICE;
        document.getElementById('selected-count').textContent = count;
        document.getElementById('total-price').textContent = `₱${total.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
        document.getElementById('btn-reserve').disabled = count === 0;
    },

    // ── Payment Modal ─────────────────────────────────────────────
    openPaymentModal() {
        if (this.selectedSeatIds.size === 0) return;

        const count = this.selectedSeatIds.size;
        const total = count * SEAT_PRICE;
        const showDt = new Date(this.currentShowtime.show_time);

        document.getElementById('pay-movie').textContent    = this.currentMovie.title;
        document.getElementById('pay-showtime').textContent = showDt.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        document.getElementById('pay-seats').textContent    = `${count} seat(s)`;
        document.getElementById('pay-total').textContent    = `₱${total.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
        document.getElementById('pay-ref').value            = '';

        // Reset to GCash by default
        document.querySelector('input[name="pay_method"][value="gcash"]').checked = true;
        this.updatePayRefLabel();

        document.getElementById('payment-modal').style.display = 'flex';
    },

    closePaymentModal() {
        document.getElementById('payment-modal').style.display = 'none';
    },

    updatePayRefLabel() {
        const method = document.querySelector('input[name="pay_method"]:checked').value;
        const refLabel = document.getElementById('pay-ref-label');
        const refInput = document.getElementById('pay-ref');

        if (method === 'gcash') {
            refLabel.textContent = 'GCash Reference No.';
            refInput.placeholder = 'e.g. 123456789012';
        } else if (method === 'credit_card') {
            refLabel.textContent = 'Card Number (last 4 digits)';
            refInput.placeholder = 'e.g. 4321';
        }
    },

    async submitPayment() {
        const method = document.querySelector('input[name="pay_method"]:checked').value;
        const ref    = document.getElementById('pay-ref').value.trim();

        if (method !== 'cash' && !ref) {
            this.showToast('Please enter a reference / card number.', 'error');
            return;
        }

        const btn = document.getElementById('btn-pay-now');
        btn.disabled    = true;
        btn.textContent = 'Processing…';

        try {
            const res = await fetch('reserve.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    showtime_id:    this.currentShowtime.id,
                    seat_ids:       Array.from(this.selectedSeatIds),
                    payment_method: method,
                    payment_ref:    ref
                })
            });
            const data = await res.json();

            this.closePaymentModal();

            if (data.success) {
                this.showToast('🎉 ' + data.message, 'success');
                if (data.receipt_token) {
                    // Show receipt button
                    const receiptUrl = 'receipt.php?token=' + encodeURIComponent(data.receipt_token);
                    const toast = document.getElementById('toast');
                    toast.innerHTML = `🎉 Reservation confirmed! <a href="${receiptUrl}" target="_blank" style="color:#fff;font-weight:700;text-decoration:underline;margin-left:.5rem;">View Receipt 🧾</a>`;
                    toast.className = 'toast show success';
                    setTimeout(() => { toast.className = 'toast'; }, 8000);
                }
            } else {
                this.showToast(data.message, 'error');
            }

            // Reload seats to reflect new state
            setTimeout(() => {
                btn.disabled    = false;
                btn.textContent = 'Pay Now & Reserve';
                this.selectShowtime(this.currentShowtime);
            }, 2000);

        } catch (error) {
            this.showToast('Network error during payment', 'error');
            btn.disabled    = false;
            btn.textContent = 'Pay Now & Reserve';
        }
    },

    switchSection(stepNum) {
        document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));
        document.getElementById(`step-${stepNum}`).classList.add('active');
    },

    goBack(stepNum) {
        this.switchSection(stepNum);
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.className = 'toast';
        }, 3500);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
