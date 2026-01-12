using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Api.Objects.Entities.Enums;

namespace Backend.Api.Objects.Entities.Models
{
    public class Event
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string? Title { get; set; }

        
        public string? Description { get; set; }

        public DateTime? DateOfPublish { get; set; }

        [Required]
        public DateTime DateOfEvent { get; set; }

        [Required]
        public EventStatus Status { get; set; }

        public byte[]? Image { get; set; }

        public int? AddressId { get; set; }
        [ForeignKey("AddressId")]
        public virtual Address? Address { get; set; }

        public int CreatedByUserId { get; set; }    
        [ForeignKey("CreatedByUserId")]
        public virtual User? CreatedByUser { get; set; }
    }
}
