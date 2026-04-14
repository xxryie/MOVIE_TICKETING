using Microsoft.EntityFrameworkCore;
using MovieTicketing.API.Data;
using MovieTicketing.API.Models;

namespace MovieTicketing.API.Services
{
    public class QueueCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<QueueCleanupService> _logger;

        public QueueCleanupService(IServiceProvider serviceProvider, ILogger<QueueCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        
                        // 1. Remove expired active sessions OR sessions that have been waiting too long without heartbeat
                        var now = DateTime.UtcNow;
                        var expiredSessions = await context.BookingQueue
                            .Where(q => q.ExpiresAt < now && q.Status == "Active")
                            .ToListAsync();

                        if (expiredSessions.Any())
                        {
                            context.BookingQueue.RemoveRange(expiredSessions);
                            await context.SaveChangesAsync();
                        }

                        // 2. Promotion Logic: For every showtime that has NO active session, promote the next waiting user
                        var showtimesInQueue = await context.BookingQueue
                            .Select(q => q.ShowtimeId)
                            .Distinct()
                            .ToListAsync();

                        foreach (var stId in showtimesInQueue)
                        {
                            var hasActive = await context.BookingQueue
                                .AnyAsync(q => q.ShowtimeId == stId && q.Status == "Active");

                            if (!hasActive)
                            {
                                var nextInLine = await context.BookingQueue
                                    .Where(q => q.ShowtimeId == stId && q.Status == "Waiting")
                                    .OrderBy(q => q.CreatedAt)
                                    .FirstOrDefaultAsync();

                                if (nextInLine != null)
                                {
                                    nextInLine.Status = "Active";
                                    nextInLine.ExpiresAt = DateTime.UtcNow.AddMinutes(5);
                                    await context.SaveChangesAsync();
                                    _logger.LogInformation($"Promoted User {nextInLine.UserId} to Active for Showtime {stId}");
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in QueueCleanupService");
                }

                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }
        }
    }
}
