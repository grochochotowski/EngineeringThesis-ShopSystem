using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Client
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(128)] public string Name { get; set; } = default!;
        [Required, MaxLength(64), EmailAddress] public string Email { get; set; } = default!;
        [Required, MaxLength(32), Phone] public string PhoneNumber { get; set; } = default!;

        [Required] public ClientType Type { get; set; }
        [MaxLength(32)] public string? TaxId { get; set; }

        // relationships 1:1 (X Client - 1 Address)
        [Required] public int AddressId { get; set; }
        public virtual Address Address { get; set; } = default!;
    }
}
