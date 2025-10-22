using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class TaxRate
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(16)] public string Code { get; set; } = default!;
        [Required, Precision(5, 4)] public decimal Rate { get; set; } = default!;
        [Required] public bool IsActive { get; set; } = true;
    }
}
