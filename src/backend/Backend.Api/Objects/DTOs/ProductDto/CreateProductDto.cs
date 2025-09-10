using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.ProductDto
{
    public class CreateProductDto
    {
        [Required][MaxLength(64)] public string SKU { get; set; } = default!;
        [Required][MaxLength(128)] public string Name { get; set; } = default!;
        [Required][MaxLength(256)] public string Description { get; set; } = default!;
        [Required][Range(typeof(decimal), "0.01", "999999.99")] public decimal Price { get; set; }
        [Required][Range(1, 9999)]  public int CategoryId { get; set; }
    }
}
