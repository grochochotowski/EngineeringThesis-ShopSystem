using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Category
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(64)] public string Name { get; set; } = default!;
        [Required, MaxLength(256)] public string Description { get; set; } = default!;
    }
}
