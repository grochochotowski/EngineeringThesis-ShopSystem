using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    [Index(nameof(Country), nameof(City), nameof(PostalCode), nameof(Street), nameof(Building), nameof(Premises), IsUnique = true)]
    public class Address
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(64)]     public string Country       { get; set; } = default!;
        [MaxLength(64)]     public string City          { get; set; } = default!;
        [MaxLength(16)]     public string PostalCode    { get; set; } = default!;
        [MaxLength(128)]    public string Street        { get; set; } = default!;
        [MaxLength(16)]     public string Building      { get; set; } = default!;
        [MaxLength(16)]     public string? Premises     { get; set; }
    }
}
