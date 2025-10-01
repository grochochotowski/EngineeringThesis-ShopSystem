using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class User
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(64)] public string FirstName { get; set; } = default!;
        [Required, MaxLength(64)] public string LastName { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(32), Phone] public string PhoneNumber { get; set; } = default!;
        [Required] public DateTime DateOfBirth { get; set; }
        [Required] public UserRole Role { get; set; }
        [Required, MaxLength(64)] public string Login { get; set; } = default!;
        [Required, MaxLength(256)] public string Password { get; set; } = default!;

        // relationships 1:1 (X Users - 1 Address)
        [Required] public int AddressId { get; set; }
        public virtual Address Address { get; set; } = default!;
    }
}
