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
        private readonly ILogger<SalesDocumentController> _logger;
        public SalesDocumentController(ISalesDocumentService service, ILogger<SalesDocumentController> logger)
        {
            _service = service;
            _logger = logger;
        }

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
                _logger.LogError(ex, "Error finalizing POS transaction: {Message}", ex.Message);
                var innerMsg = ex.InnerException?.Message ?? "";
                var innerTrace = ex.InnerException?.StackTrace ?? "";
                return StatusCode(500, new {
                    error = "An unexpected error occurred during transaction finalization.",
                    details = ex.Message,
                    innerException = innerMsg,
                    innerStackTrace = innerTrace,
                    stackTrace = ex.StackTrace
                });
            }
        }

        // --- PROCESS RETURN ---
        [HttpPost("process-return")]
        [Authorize(Roles = "Cashier,ShopAssistant,DeputyManager,Manager,SeniorManager,Director,Administrator,Root")]
        public async Task<ActionResult<POSReturnResponseDto>> ProcessReturn(
            [FromBody] POSReturnDto dto,
            CancellationToken ct)
        {
            try
            {
                if (!ModelState.IsValid) return ValidationProblem(ModelState);

                var result = await _service.ProcessReturnAsync(dto, ct);
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
                _logger.LogError(ex, "Error processing return: {Message}", ex.Message);
                var innerMsg = ex.InnerException?.Message ?? "";
                return StatusCode(500, new {
                    error = "An unexpected error occurred during return processing.",
                    details = ex.Message,
                    innerException = innerMsg
                });
            }
        }

        // --- GET SALES DOCUMENT BY DOCUMENT NUMBER ---
        [HttpGet("by-number")]
        public async Task<ActionResult<GetSalesDocumentDto>> GetByDocumentNumber([FromQuery] string documentNumber, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(documentNumber))
                return BadRequest(new { error = "Document number is required" });

            var dto = await _service.GetByDocumentNumberAsync(documentNumber, ct);
            return dto is null ? NotFound() : Ok(dto);
        }
    }
}
