using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Parcel
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(256)] public string Description { get; set; }
        [Required, Precision(18, 3)] public decimal Weight { get; set; }
        [Required, Precision(18, 3)] public decimal Length { get; set; }
        [Required, Precision(18, 3)] public decimal Width { get; set; }
        [Required, Precision(18, 3)] public decimal Height { get; set; }


        // relationships N:N
        public virtual ICollection<Product>? Products { get; set; } = new List<Product>();
    }
}
