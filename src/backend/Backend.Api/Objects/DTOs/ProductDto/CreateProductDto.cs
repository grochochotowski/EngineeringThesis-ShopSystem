using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.ProductDto
{
    public class CreateProductDto
    {
        [Required(ErrorMessage = "SKU is required")]
        [MaxLength(64, ErrorMessage = "SKU max 64 chars")]
        public string SKU { get; set; } = default!;

        [Required(ErrorMessage = "Name is required")]
        [MaxLength(128, ErrorMessage = "Name max 128 chars")]
        public string Name { get; set; } = default!;

        [Required(ErrorMessage = "Description is required")]
        [MaxLength(256, ErrorMessage = "Description max 256 chars")]
        public string Description { get; set; } = default!;

        [Required(ErrorMessage = "Price is required")]
        [Range(0.01, 999999.99, ErrorMessage = "Price must be positive")]
        public decimal Price { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "CategoryId must be >= 1")]
        public int CategoryId { get; set; }
    }
}
