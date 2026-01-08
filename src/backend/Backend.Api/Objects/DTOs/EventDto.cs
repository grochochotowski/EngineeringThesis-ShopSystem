using System;
using Backend.Api.Objects.Entities.Enums;

namespace Backend.Api.Objects.DTOs
{
    public class EventDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime? DateOfPublish { get; set; }
        public DateTime DateOfEvent { get; set; }
        public string Status { get; set; }
        public byte[]? Image { get; set; }
        public GetAddressDto? Address { get; set; }
        public GetUserDto? CreatedByUser { get; set; }
    }
}
