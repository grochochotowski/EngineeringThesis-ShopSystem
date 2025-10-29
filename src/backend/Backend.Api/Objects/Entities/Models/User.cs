using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    [Index(nameof(Login), IsUnique = true)]
    [Index(nameof(Email), IsUnique = true)]
    [Index(nameof(PhoneNumber), IsUnique = true)]
    public class User
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(64)]                 public string FirstName     { get; set; } = default!;
        [MaxLength(64)]                 public string LastName      { get; set; } = default!;
        [MaxLength(64)]                 public string Login         { get; set; } = default!;
        [MaxLength(256)]                public string PasswordHash  { get; set; } = default!;
        [MaxLength(64), EmailAddress]   public string Email         { get; set; } = default!;
        [MaxLength(32), Phone]          public string PhoneNumber   { get; set; } = default!;
                                        public DateTime DateOfBirth { get; set; }
                                        public UserRole Role        { get; set; }

        // --- Foreign Keys ---
        public int AddressId { get; set; }

        // --- Navigation Properties ---
        public virtual Address Address { get; set; } = default!;
    }
}
