using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Api.Api.Services
{
    public interface IEventsService
    {
        Task<EventDto> CreateAsync(CreateEventDto dto, CancellationToken ct);
        Task<EventDto?> GetByIdAsync(int id, CancellationToken ct);
        Task<PagedResult<EventDto>> GetAllAsync(string? q, int pageNumber, int pageSize, string? orderBy, string? sortDirection, string? status, CancellationToken ct);
        Task<bool> UpdateAsync(int id, UpdateEventDto dto, CancellationToken ct);
        Task<bool> DeleteAsync(int id, CancellationToken ct);
        Task<bool> PublishAsync(int id, CancellationToken ct);
        Task<bool> CancelAsync(int id, CancellationToken ct);
    }
}
