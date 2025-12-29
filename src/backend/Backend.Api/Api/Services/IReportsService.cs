using Backend.Api.Objects.DTOs;

namespace Backend.Api.Api.Services
{
    public interface IReportsService
    {
        Task<SalesReportDto> GetSalesReportAsync(
            DateTime? dateFrom,
            DateTime? dateTo,
            int userId,
            CancellationToken ct = default);
    }
}
