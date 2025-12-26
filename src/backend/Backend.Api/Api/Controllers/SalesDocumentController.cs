using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: /api/SalesDocument
    public class SalesDocumentController : ControllerBase
    {
        private readonly ISalesDocumentService _service;
        public SalesDocumentController(ISalesDocumentService service) => _service = service;

        // --- CREATE SALES DOCUMENT ---
        [HttpPost]
        public async Task<ActionResult<int>> Create([FromBody] CreateSalesDocumentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var id = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id }, id);
        }

        // --- GET SALES DOCUMENTS (pagination and filters) ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetSalesDocumentListItemDto>>> GetAll(
            [FromQuery] SalesDocumentType? type,
            [FromQuery] int? clientId,
            [FromQuery] DateTimeOffset? from,
            [FromQuery] DateTimeOffset? to,
            [FromQuery] string? q,
            [FromQuery] string? paymentType,
            [FromQuery] decimal? minAmount,
            [FromQuery] decimal? maxAmount,
            [FromQuery] string? orderBy,
            [FromQuery] string? sortDirection,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.GetAllAsync(type, clientId, from, to, q, paymentType, minAmount, maxAmount, orderBy, sortDirection, pagination, ct);
            return Ok(result);
        }

        // --- GET SALES DOCUMENT BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetSalesDocumentDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto is null ? NotFound() : Ok(dto);
        }

        // --- UPDATE SALES DOCUMENT HEADER ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateHeader(int id, [FromBody] UpdateSalesDocumentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            await _service.UpdateHeaderAsync(id, dto, ct);
            return NoContent();
        }

        // --- FINALIZE POS TRANSACTION ---
        [HttpPost("finalize")]
        [Authorize(Roles = "Cashier,ShopAssistant,DeputyManager,Manager,SeniorManager,Director,Administrator,Root")]
        public async Task<ActionResult<POSFinalizationResponseDto>> FinalizePOSTransaction(
            [FromBody] POSFinalizationDto dto,
            CancellationToken ct)
        {
            try
            {
                if (!ModelState.IsValid) return ValidationProblem(ModelState);

                var result = await _service.FinalizePOSTransactionAsync(dto, ct);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An unexpected error occurred during transaction finalization.", details = ex.Message });
            }
        }
    }
}
