using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Enums;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Api.Api.Services
{
    public class EventsService : IEventsService
    {
        private readonly AppDbContext _context;

        public EventsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<EventDto> CreateAsync(CreateEventDto dto, CancellationToken ct)
        {
            var newEvent = new Event
            {
                Title = dto.Title,
                Description = dto.Description,
                DateOfEvent = dto.DateOfEvent,
                Status = EventStatus.Created,
                Image = dto.Image,
                AddressId = dto.AddressId,
                CreatedByUserId = dto.CreatedByUserId
            };

            _context.Events.Add(newEvent);
            await _context.SaveChangesAsync(ct);

            return ToDto(newEvent);
        }

        public async Task<EventDto?> GetByIdAsync(int id, CancellationToken ct)
        {
            var eventEntity = await _context.Events
                .Include(e => e.Address)
                .Include(e => e.CreatedByUser)
                .FirstOrDefaultAsync(e => e.Id == id, ct);
            return eventEntity == null ? null : ToDto(eventEntity);
        }

        public async Task<PagedResult<EventDto>> GetAllAsync(string? q, int pageNumber, int pageSize, string? orderBy, string? sortDirection, string? status, CancellationToken ct)
        {
            var query = _context.Events.AsQueryable();

            // Apply filters BEFORE including navigation properties
            if (!string.IsNullOrWhiteSpace(q))
            {
                query = query.Where(e => e.Title.Contains(q) || e.Description.Contains(q));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                if (Enum.TryParse<EventStatus>(status, true, out var statusEnum))
                {
                    query = query.Where(e => e.Status == statusEnum);
                }
            }

            // Apply sorting
            if (!string.IsNullOrWhiteSpace(orderBy))
            {
                query = orderBy.ToLower() switch
                {
                    "id" => sortDirection?.ToLower() == "desc" ? query.OrderByDescending(e => e.Id) : query.OrderBy(e => e.Id),
                    "title" => sortDirection?.ToLower() == "desc" ? query.OrderByDescending(e => e.Title) : query.OrderBy(e => e.Title),
                    "dateofevent" => sortDirection?.ToLower() == "desc" ? query.OrderByDescending(e => e.DateOfEvent) : query.OrderBy(e => e.DateOfEvent),
                    "dateofpublish" => sortDirection?.ToLower() == "desc" ? query.OrderByDescending(e => e.DateOfPublish) : query.OrderBy(e => e.DateOfPublish),
                    "status" => sortDirection?.ToLower() == "desc" ? query.OrderByDescending(e => e.Status) : query.OrderBy(e => e.Status),
                    _ => query
                };
            }

            // Select only needed fields for list view (exclude Image for performance)
            var pagedResult = await query.Select(e => new EventDto
            {
                Id = e.Id,
                Title = e.Title,
                Description = e.Description,
                DateOfPublish = e.DateOfPublish,
                DateOfEvent = e.DateOfEvent,
                Status = e.Status.ToString(),
                Image = null, // Exclude image from list view for performance
                Address = e.Address == null ? null : new GetAddressDto
                {
                    Id = e.Address.Id,
                    Country = e.Address.Country.ToString(),
                    City = e.Address.City,
                    Street = e.Address.Street,
                    Building = e.Address.Building,
                    Premises = e.Address.Premises,
                    PostalCode = e.Address.PostalCode
                },
                CreatedByUser = e.CreatedByUser == null ? null : new GetUserDto
                {
                    Id = e.CreatedByUser.Id,
                    FirstName = e.CreatedByUser.FirstName,
                    LastName = e.CreatedByUser.LastName,
                    Email = e.CreatedByUser.Email,
                    PhoneNumber = e.CreatedByUser.PhoneNumber,
                    Role = e.CreatedByUser.Role
                }
            }).ToPagedResultAsync(pageNumber, pageSize, ct);

            return pagedResult;
        }

        public async Task<bool> UpdateAsync(int id, UpdateEventDto dto, CancellationToken ct)
        {
            var eventEntity = await _context.Events.FindAsync(new object[] { id }, ct);
            if (eventEntity == null)
            {
                return false;
            }

            eventEntity.Title = dto.Title;
            eventEntity.Description = dto.Description;
            eventEntity.DateOfEvent = dto.DateOfEvent;
            if(dto.Image != null)
            {
                eventEntity.Image = dto.Image;
            }

            await _context.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct)
        {
            var eventEntity = await _context.Events.FindAsync(new object[] { id }, ct);
            if (eventEntity == null)
            {
                return false;
            }

            _context.Events.Remove(eventEntity);
            await _context.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> PublishAsync(int id, CancellationToken ct)
        {
            var eventEntity = await _context.Events.FindAsync(new object[] { id }, ct);
            if (eventEntity == null || eventEntity.Image == null)
            {
                return false;
            }

            eventEntity.Status = EventStatus.Published;
            eventEntity.DateOfPublish = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> CancelAsync(int id, CancellationToken ct)
        {
            var eventEntity = await _context.Events.FindAsync(new object[] { id }, ct);
            if (eventEntity == null)
            {
                return false;
            }

            eventEntity.Status = EventStatus.Canceled;
            await _context.SaveChangesAsync(ct);
            return true;
        }

        private static EventDto ToDto(Event e) => new EventDto
        {
            Id = e.Id,
            Title = e.Title,
            Description = e.Description,
            DateOfPublish = e.DateOfPublish,
            DateOfEvent = e.DateOfEvent,
            Status = e.Status.ToString(),
            Image = e.Image,
            Address = e.Address == null ? null : new GetAddressDto
            {
                Id = e.Address.Id,
                Country = e.Address.Country.ToString(),
                City = e.Address.City,
                Street = e.Address.Street,
                Building = e.Address.Building,
                Premises = e.Address.Premises,
                PostalCode = e.Address.PostalCode
            },
            CreatedByUser = e.CreatedByUser == null ? null : new GetUserDto
            {
                Id = e.CreatedByUser.Id,
                FirstName = e.CreatedByUser.FirstName,
                LastName = e.CreatedByUser.LastName,
                Email = e.CreatedByUser.Email,
                PhoneNumber = e.CreatedByUser.PhoneNumber,
                Role = e.CreatedByUser.Role
            }
        };
    }
}
