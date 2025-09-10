using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.DeliveryCompanyDto
{
    public class GetDeliveryCompanyListItemDto
    {
        public int Key { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string PhoneNumber { get; set; } = default!;
    }
}
