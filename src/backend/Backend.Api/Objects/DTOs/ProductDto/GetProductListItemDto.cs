using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.ProductDto
{
    public class GetProductListItemDto
    {
        public int Id { get; set; }
        public string SKU { get; set; } = default!;
        public string Name { get; set; } = default!;
        public decimal Price { get; set; }
        public int CategoryId { get; set; }
        public int TotalQuantity { get; set; }
    }
}
