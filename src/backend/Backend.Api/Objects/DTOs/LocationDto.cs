using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET LOCATION INFO ---
    public class GetLocationDto
    {
        public int Id { get; set; }
        public string Zone { get; set; } = default!;
        public string Column { get; set; } = default!;
        public string Shelf { get; set; } = default!;
        public string LocationCode { get; set; } = default!;
    }

    // --- GET PRODUCT IN LOCATION ---
    public class GetProductInLocationDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = default!;
        public string ProductSKU { get; set; } = default!;
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = default!;
        public int Quantity { get; set; }
    }

    // --- CREATE LOCATION ---
    public class CreateLocationDto
    {
        [Required, MaxLength(4), MinLength(1)]
        public string Zone { get; set; } = default!;

        [Required, MaxLength(4), MinLength(1)]
        public string Column { get; set; } = default!;

        [Required, MaxLength(4), MinLength(1)]
        public string Shelf { get; set; } = default!;
    }

    // --- UPDATE LOCATION ---
    public class UpdateLocationDto
    {
        [Required, MaxLength(4), MinLength(1)]
        public string Zone { get; set; } = default!;

        [Required, MaxLength(4), MinLength(1)]
        public string Column { get; set; } = default!;

        [Required, MaxLength(4), MinLength(1)]
        public string Shelf { get; set; } = default!;
    }

    // --- ADD PRODUCT TO LOCATION ---
    public class AddProductToLocationDto
    {
        [Required]
        public int ProductId { get; set; }

        [Required, Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    // --- REMOVE PRODUCT FROM LOCATION ---
    public class RemoveProductFromLocationDto
    {
        [Required]
        public int ProductId { get; set; }

        [Required, Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    // --- MOVE PRODUCT BETWEEN LOCATIONS ---
    public class MoveProductDto
    {
        [Required]
        public int ProductId { get; set; }

        [Required]
        public int FromLocationId { get; set; }

        [Required]
        public int ToLocationId { get; set; }

        [Required, Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }
}
