using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Product
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(64)] public string SKU { get; set; }
        [Required, MaxLength(128)] public string Name { get; set; }
        [Required, MaxLength(256)] public string Description { get; set; }
        [Required][Precision(18, 2)] public decimal Price { get; set; }

        public bool Defective { get; set; }
        [MaxLength(256)] public string? DefectDescription { get; set; }

        // relationships N:1
        [Required] public int CategoryId { get; set; }
        public virtual Category Category { get; set; }

        // relationships N:N
        public virtual ICollection<WarehouseProduct> WarehouseProducts { get; set; } = new List<WarehouseProduct>();
        public virtual ICollection<Parcel> Parcels { get; set; } = new List<Parcel>();
    }
}
