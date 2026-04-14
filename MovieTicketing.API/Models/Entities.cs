using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieTicketing.API.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    }

    public class Admin
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Movie
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Synopsis { get; set; }
        public string? PosterUrl { get; set; }
        public int DurationMinutes { get; set; }
        public decimal Price { get; set; } = 250.00m;
        public string Status { get; set; } = "now_showing"; // now_showing or coming_soon
        public string? Genre { get; set; }
        public string? Director { get; set; }
        public string? Cast { get; set; }
        public string? Language { get; set; }
        public string? Rating { get; set; }
        public string? TrailerUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
    }

    public class Showtime
    {
        public int Id { get; set; }
        public int MovieId { get; set; }
        public DateTime ShowTime { get; set; }
        public string CinemaType { get; set; } = "Standard"; // Standard, IMAX, Directors Club
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Movie? Movie { get; set; }
        public ICollection<Seat> Seats { get; set; } = new List<Seat>();
        public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    }

    public class Seat
    {
        public int Id { get; set; }
        public int ShowtimeId { get; set; }
        public string SeatRow { get; set; } = string.Empty;
        public int SeatCol { get; set; }
        public string Status { get; set; } = "available"; // available, reserved, locked
        public DateTime? LockedUntil { get; set; }

        // Navigation
        public Showtime? Showtime { get; set; }
    }

    public class Reservation
    {
        public int Id { get; set; }
        public int ShowtimeId { get; set; }
        public int SeatId { get; set; }
        public int UserId { get; set; }
        public string? ReceiptToken { get; set; }
        public string Status { get; set; } = "confirmed";
        [Column(TypeName = "decimal(10,2)")]
        public decimal TotalAmount { get; set; } = 250.00m;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Showtime? Showtime { get; set; }
        public Seat? Seat { get; set; }
        public User? User { get; set; }
        public Payment? Payment { get; set; }
    }

    public class Payment
    {
        public int Id { get; set; }
        public int ReservationId { get; set; }
        public int UserId { get; set; }
        [Column(TypeName = "decimal(10,2)")]
        public decimal Amount { get; set; } = 250.00m;
        public string PaymentMethod { get; set; } = "gcash";
        public string? PaymentRef { get; set; }
        public DateTime PaidAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Reservation? Reservation { get; set; }
        public User? User { get; set; }
    }

    public class BookingQueue
    {
        public int Id { get; set; }
        public int ShowtimeId { get; set; }
        public int UserId { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string Status { get; set; } = "Waiting"; // Waiting, Active
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Showtime? Showtime { get; set; }
        public User? User { get; set; }
    }
}
