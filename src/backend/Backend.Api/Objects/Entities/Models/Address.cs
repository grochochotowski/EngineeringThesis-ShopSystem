using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Address
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(64)] public string Country { get; set; } = default!;
        [Required, MaxLength(64)] public string City { get; set; } = default!;
        [Required, MaxLength(16)] public string PostalCode { get; set; } = default!;
        [Required, MaxLength(128)] public string Street { get; set; } = default!;
        [Required, MaxLength(16)] public string Building { get; set; } = default!;
        [MaxLength(16)] public string? Premises { get; set; }
         
    }
}
