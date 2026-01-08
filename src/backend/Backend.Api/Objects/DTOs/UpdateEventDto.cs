using System;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class UpdateEventDto
    {
        [Required]
        [MaxLength(100)]
        public string Title { get; set; }

        [Required]
        public string Description { get; set; }

        [Required]
        public DateTime DateOfEvent { get; set; }

        public byte[]? Image { get; set; }
    }
}
