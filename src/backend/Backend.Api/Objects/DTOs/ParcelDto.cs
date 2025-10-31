using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetParcelDto
    {
                                                    public int Id               { get; set; }
                                                    public string Description   { get; set; } = default!;
                                                    public decimal Weight       { get; set; }
                                                    public decimal Length       { get; set; }
                                                    public decimal Width        { get; set; }
                                                    public decimal Height       { get; set; }
                                                    public int? ShipmentId      { get; set; }
    }
    public class GetParcelProductsDto
    {
        public IEnumerable<ParcelProductItemDto> Products { get; set; } = Array.Empty<ParcelProductItemDto>();
    }

    public class ParcelProductItemDto
    {
                                                    public int ProductId        { get; set; }
                                                    public string ProductName   { get; set; } = default!;
                                                    public int Quantity         { get; set; }
    }

    public class CreateParcelDto
    {
        [Required, MaxLength(256)]                  public string Description   { get; set; } = default!;
        [Required, Range(0.001, double.MaxValue)]   public decimal Weight       { get; set; }
        [Required, Range(0.001, double.MaxValue)]   public decimal Length       { get; set; }
        [Required, Range(0.001, double.MaxValue)]   public decimal Width        { get; set; }
        [Required, Range(0.001, double.MaxValue)]   public decimal Height       { get; set; }
                                                    public int? ShipmentId      { get; set; }
    }

    public class UpdateParcelDto
    {
        [Required, MaxLength(256)]                  public string Description   { get; set; } = default!;
        [Required, Range(0.001, double.MaxValue)]   public decimal Weight       { get; set; }
        [Required, Range(0.001, double.MaxValue)]   public decimal Length       { get; set; }
        [Required, Range(0.001, double.MaxValue)]   public decimal Width        { get; set; }
        [Required, Range(0.001, double.MaxValue)]   public decimal Height       { get; set; }
    }

    public class AddProductToParcelDto
    {
        [Required]                                  public int ProductId        { get; set; }
        [Required, Range(1, int.MaxValue)]          public int Quantity         { get; set; }
    }

    public class RemoveProductFromParcelDto
    {
        [Required]                                  public int ProductId        { get; set; }
        [Required, Range(1, int.MaxValue)]          public int Quantity         { get; set; }
    }
}
