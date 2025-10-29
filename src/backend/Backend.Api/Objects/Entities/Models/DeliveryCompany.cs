using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    [Index(nameof(Name), IsUnique = true)]
    [Index(nameof(Email), IsUnique = true)]
    [Index(nameof(PhoneNumber), IsUnique = true)]
    public class DeliveryCompany
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(64)]               public string Name        { get; set; } = default!;
        [MaxLength(64), EmailAddress] public string Email       { get; set; } = default!;
        [MaxLength(32), Phone]        public string PhoneNumber { get; set; } = default!;

        // --- Foreign Keys ---
        [Required] public int AddressId { get; set; }

        // --- Navigation Properties ---
        public virtual Address Address { get; set; } = default!;
    }
}
