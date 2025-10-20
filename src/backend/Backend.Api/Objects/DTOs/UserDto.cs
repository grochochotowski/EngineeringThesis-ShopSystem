using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetUserDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = default!;
        public string LastName { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string PhoneNumber { get; set; } = default!;
        public DateTime DateOfBirth { get; set; }
        public UserRole Role { get; set; }
        public string Login { get; set; } = default!;
        public int AddressId { get; set; }
    }

    public class CreateUserDto
    {
        [Required, MaxLength(64)] public string FirstName { get; set; } = default!;
        [Required, MaxLength(64)] public string LastName { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(32), Phone] public string PhoneNumber { get; set; } = default!;
        [Required] public DateTime DateOfBirth { get; set; }
        [Required] public UserRole Role { get; set; }
        [Required, MaxLength(64)] public string Login { get; set; } = default!;
        [Required, MaxLength(256)] public string Password { get; set; } = default!;
        public int? AddressId { get; set; }
        public CreateAddressDto? Address { get; set; }
    }

    public class UpdateUserDto
    {
        [Required, MaxLength(64)] public string FirstName { get; set; } = default!;
        [Required, MaxLength(64)] public string LastName { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(32), Phone] public string PhoneNumber { get; set; } = default!;
        [Required] public DateTime DateOfBirth { get; set; }
        [Required] public UserRole Role { get; set; }
        [Required] public int AddressId { get; set; }
    }

    public class UpdateUserPasswordOrLoginDto
    {
        [Required, MaxLength(64)] public string Login { get; set; } = default!;
        [Required, MaxLength(256)] public string Password { get; set; } = default!;
    }
}
