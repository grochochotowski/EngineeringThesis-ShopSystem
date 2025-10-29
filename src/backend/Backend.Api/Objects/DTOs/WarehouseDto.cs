using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetWarehouseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public int AddressId { get; set; }
    }

    public class GetWarehouseProductItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = default!;
        public int Quantity { get; set; }
    }

    public class CreateWarehouseDto
    {
        [Required, MaxLength(128)] public string Name { get; set; } = default!;
        public CreateAddressDto Address { get; set; }
    }

    public class UpdateWarehouseDto
    {
        [Required, MaxLength(128)] public string Name { get; set; } = default!;
        [Required] public int AddressId { get; set; }
    }

    public class AddProductToWarehouseDto
    {
        [Required] public int ProductId { get; set; }
        [Required, Range(1, int.MaxValue)] public int Quantity { get; set; }
    }

    public class RemoveProductFromWarehouseDto
    {
        [Required] public int ProductId { get; set; }
        [Required, Range(1, int.MaxValue)] public int Quantity { get; set; }
    }
}
