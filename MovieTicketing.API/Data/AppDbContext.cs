using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Models;

namespace MovieTicketing.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Admin> Admins { get; set; }
        public DbSet<Movie> Movies { get; set; }
        public DbSet<Showtime> Showtimes { get; set; }
        public DbSet<Seat> Seats { get; set; }
        public DbSet<Reservation> Reservations { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<BookingQueue> BookingQueue { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Unique constraints
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Admin>()
                .HasIndex(a => a.Username)
                .IsUnique();

            modelBuilder.Entity<Seat>()
                .HasIndex(s => new { s.ShowtimeId, s.SeatRow, s.SeatCol })
                .IsUnique();

            modelBuilder.Entity<Movie>()
                .Property(m => m.Price)
                .HasColumnType("numeric(18,2)");

            modelBuilder.Entity<Reservation>()
                .Property(r => r.TotalAmount)
                .HasColumnType("numeric(18,2)");

            modelBuilder.Entity<Payment>()
                .Property(p => p.Amount)
                .HasColumnType("numeric(18,2)");

            base.OnModelCreating(modelBuilder);
        }
    }
}
