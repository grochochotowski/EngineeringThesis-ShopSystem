using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    [Index(nameof(Name), IsUnique = true)]
    public class Category
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(64)]     public string Name          { get; set; } = default!;
        [MaxLength(256)]    public string? Description  { get; set; }
    }
}
