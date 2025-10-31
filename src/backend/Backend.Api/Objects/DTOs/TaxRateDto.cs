using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetTaxRateDto
    {
                                    public int Id           { get; set; }
                                    public string Code      { get; set; } = default!;
                                    public decimal Rate     { get; set; }
                                    public bool IsActive    { get; set; }
    }

    public class CreateTaxRateDto
    {
        [Required, MaxLength(16)]   public string Code      { get; set; } = default!;
        [Required, Range(0, 1)]     public decimal Rate     { get; set; }
                                    public bool IsActive    { get; set; } = true;
    }

    public class UpdateTaxRateDto
    {
        [Required, MaxLength(16)]   public string Code      { get; set; } = default!;
        [Required, Range(0, 1)]     public decimal Rate     { get; set; }
                                    public bool IsActive    { get; set; } = true;
    }
}
