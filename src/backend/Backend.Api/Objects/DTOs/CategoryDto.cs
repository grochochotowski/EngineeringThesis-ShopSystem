using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetCategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public string Description { get; set; } = default!;
    }

    public class CreateCategoryDto
    {
        [Required, MaxLength(64)] public string Name { get; set; } = default!;
        [Required, MaxLength(256)] public string Description { get; set; } = default!;
    }

    public class UpdateCategoryDto
    {
        [Required, MaxLength(64)] public string Name { get; set; } = default!;
        [Required, MaxLength(256)] public string Description { get; set; } = default!;
    }
}
