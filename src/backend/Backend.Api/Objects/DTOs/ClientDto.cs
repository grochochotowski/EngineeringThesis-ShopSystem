using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetClientDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = default!;
        public string LastName { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string PhoneNumber { get; set; } = default!;
        public DateTime DateOfBirth { get; set; }
        public ClientType Type { get; set; }
        public int AddressId { get; set; }
    }
    
    public class CreateClientDto
    {
        [Required, MaxLength(64)] public string FirstName { get; set; } = default!;
        [Required, MaxLength(64)] public string LastName { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(32), Phone] public string PhoneNumber { get; set; } = default!;
        [Required] public DateTime DateOfBirth { get; set; }
        [Required] public ClientType Type { get; set; }
        [Required] public int AddressId { get; set; }
    }

    public class CreateClientWithAddressDto
    {
        [Required, MaxLength(64)] public string FirstName { get; set; } = default!;
        [Required, MaxLength(64)] public string LastName { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(32), Phone] public string PhoneNumber { get; set; } = default!;
        [Required] public DateTime DateOfBirth { get; set; }
        [Required] public ClientType Type { get; set; }

        [Required] public CreateAddressDto Address { get; set; } = default!;
    }

    public class UpdateClientDto
    {
        [Required, MaxLength(64)] public string FirstName { get; set; } = default!;
        [Required, MaxLength(64)] public string LastName { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(32), Phone] public string PhoneNumber { get; set; } = default!;
        [Required] public DateTime DateOfBirth { get; set; }
        [Required] public ClientType Type { get; set; }
        [Required] public int AddressId { get; set; }
    }
}
