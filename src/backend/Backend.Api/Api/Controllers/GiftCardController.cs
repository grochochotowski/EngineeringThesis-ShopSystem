using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GiftCardController : ControllerBase
    {
        private readonly IGiftCardService _giftCardService;

        public GiftCardController(IGiftCardService giftCardService)
        {
            _giftCardService = giftCardService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? code,
            [FromQuery] bool? isActive,
            [FromQuery] string? orderBy,
            [FromQuery] string? sortDirection,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 50,
            CancellationToken ct = default)
        {
            try
            {
                var pagination = new PaginationParams
                {
                    PageNumber = pageNumber,
                    PageSize = pageSize
                };

                var result = await _giftCardService.GetAllAsync(
                    code, isActive, orderBy, sortDirection, pagination, ct);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id, CancellationToken ct = default)
        {
            try
            {
                var giftCard = await _giftCardService.GetByIdAsync(id, ct);

                if (giftCard == null)
                    return NotFound(new { error = "Gift card not found" });

                return Ok(giftCard);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("code/{code}")]
        public async Task<IActionResult> GetByCode(string code, CancellationToken ct = default)
        {
            try
            {
                var giftCard = await _giftCardService.GetByCodeAsync(code, ct);

                if (giftCard == null)
                    return NotFound(new { error = "Gift card not found" });

                return Ok(giftCard);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("validate")]
        public async Task<IActionResult> Validate([FromBody] ValidateGiftCardDto dto, CancellationToken ct = default)
        {
            try
            {
                var result = await _giftCardService.ValidateGiftCardAsync(dto.Code, ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateGiftCardDto dto, CancellationToken ct = default)
        {
            try
            {
                var result = await _giftCardService.CreateAsync(dto, ct);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("use")]
        public async Task<IActionResult> Use([FromBody] UseGiftCardDto dto, CancellationToken ct = default)
        {
            try
            {
                var result = await _giftCardService.UseGiftCardAsync(dto, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Deactivate(int id, CancellationToken ct = default)
        {
            try
            {
                await _giftCardService.DeactivateAsync(id, ct);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
