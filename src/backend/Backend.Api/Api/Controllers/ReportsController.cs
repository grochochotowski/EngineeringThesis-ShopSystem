using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: /api/Reports
    public class ReportsController : ControllerBase
    {
        private readonly IReportsService _service;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(IReportsService service, ILogger<ReportsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        // --- GET SALES REPORT ---
        [HttpGet("sales")]
        public async Task<ActionResult<SalesReportDto>> GetSalesReport(
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] bool includeProductDetails = false,
            CancellationToken ct = default)
        {
            try
            {
                // Get user ID from claims
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized("User ID not found in token.");
                }

                var report = await _service.GetSalesReportAsync(dateFrom, dateTo, userId, includeProductDetails, ct);
                return Ok(report);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid operation while generating sales report.");
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating sales report.");
                return StatusCode(500, new { error = "An error occurred while generating the report." });
            }
        }
    }
}
