namespace Backend.Api.Objects.Entities.Models
{
    public class UserCredential
    {
        // --- Key ---
        public int UserId                       { get; set; }

        // --- Basic fields ---
        public string Login                     { get; set; } = default!;
        public string PasswordHash              { get; set; } = default!;
        public string PasswordSalt              { get; set; } = default!;

        public bool IsActive                    { get; set; } = true;
        public int FailedAttempts               { get; set; }
        public DateTimeOffset? LockedUntil      { get; set; }
        public DateTimeOffset PasswordUpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // --- Navigation Properties ---
        public virtual User User                { get; set; } = default!;
    }
}
