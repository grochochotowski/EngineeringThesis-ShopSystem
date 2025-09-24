using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.ClientDto
{
    public class GetClientListItemDto
    {
        public int Key { get; set; } = default!;
        public string FirstName { get; set; } = default!;
        public string LastName { get; set; } = default!;
        public ClientType Type { get; set; }
    }
}
