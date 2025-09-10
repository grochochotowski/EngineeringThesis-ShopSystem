using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.CategoryDto
{
    public class CreateCategoryDto
    {
        [Required, MaxLength(128)] public string Name { get; set; } = default!;
        [Required, MaxLength(256)] public string Description { get; set; } = default!;
    }
}
 