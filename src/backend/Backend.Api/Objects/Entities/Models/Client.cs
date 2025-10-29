using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    [Index(nameof(Email), IsUnique = true)]
    [Index(nameof(PhoneNumber), IsUnique = true)]
    [Index(nameof(TaxId), IsUnique = true)]
    public class Client
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(128)]    public string Name   { get; set; } = default!;
        [MaxLength(32)]     public string? TaxId { get; set; }

        public ClientType Type { get; set; }

        [MaxLength(64), EmailAddress]   public string Email       { get; set; } = default!;
        [MaxLength(32), Phone]          public string PhoneNumber { get; set; } = default!;

        // --- Foreign Keys ---
        public int AddressId { get; set; }

        // --- Navigation Properties ---
        public virtual Address Address { get; set; } = default!;
    }
}
