using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.ParcelDto
{
    public class CreateParcelDto
    {
        [Required, MaxLength(256)] public string Description { get; set; }
        [Range(typeof(decimal), "0.01", "999.99")] public decimal Weight { get; set; }
        [Range(typeof(decimal), "0.01", "999.99")] public decimal Length { get; set; }
        [Range(typeof(decimal), "0.01", "999.99")] public decimal Width { get; set; }
        [Range(typeof(decimal), "0.01", "999.99")] public decimal Height { get; set; }
    }
}
