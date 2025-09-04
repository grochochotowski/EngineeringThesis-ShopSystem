using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Product
    {
        [Key] public int Id { get; set; }
        [Required] public string SKU { get; set; }
        [Required] public string Name { get; set; }
        [Required][Precision(18, 2)] public decimal Price { get; set; }
        public int Stock { get; set; }

    }
}
