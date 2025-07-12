import axios from "axios";
import { chunkedData } from "../embeddings/processedData.js";
import fs from "fs";
import path from "path";

/**
 * Check the accessibility of image URLs in chunkedData
 * Verifies each URL returns 200 status and serves content as image type
 */
async function checkImageUrls() {
  console.log("🔍 Starting image URL accessibility check...\n");

  const results = {
    total: chunkedData.length,
    accessible: 0,
    inaccessible: 0,
    errors: [],
    details: [],
  };

  // Process URLs with concurrency control to avoid overwhelming the server
  const concurrencyLimit = 5;
  const batches = [];

  for (let i = 0; i < chunkedData.length; i += concurrencyLimit) {
    batches.push(chunkedData.slice(i, i + concurrencyLimit));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(
      `Processing batch ${batchIndex + 1}/${batches.length} (${
        batch.length
      } URLs)...`
    );

    const batchPromises = batch.map(async (item, index) => {
      const globalIndex = batchIndex * concurrencyLimit + index;
      const url = item.image_data_url;
      const page = item.page;

      try {
        console.log(`  Checking page ${page}: ${url}`);

        const response = await axios.head(url, {
          timeout: 10000, // 10 second timeout
          validateStatus: (status) => true, // Don't throw on any status code
        });

        const status = response.status;
        const contentType = response.headers["content-type"] || "";
        const contentLength = response.headers["content-length"] || "unknown";

        const isAccessible = status === 200 && contentType.startsWith("image/");

        const result = {
          page,
          url,
          status,
          contentType,
          contentLength,
          isAccessible,
          timestamp: new Date().toISOString(),
        };

        if (isAccessible) {
          results.accessible++;
          console.log(
            `    ✅ Page ${page}: Accessible (${status}, ${contentType})`
          );
        } else {
          results.inaccessible++;
          console.log(
            `    ❌ Page ${page}: Inaccessible (${status}, ${contentType})`
          );
        }

        results.details.push(result);

        return result;
      } catch (error) {
        const errorResult = {
          page,
          url,
          status: "ERROR",
          contentType: "unknown",
          contentLength: "unknown",
          isAccessible: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };

        results.inaccessible++;
        results.errors.push({
          page,
          url,
          error: error.message,
        });

        console.log(`    ❌ Page ${page}: Error - ${error.message}`);
        results.details.push(errorResult);

        return errorResult;
      }
    });

    // Wait for current batch to complete before processing next batch
    await Promise.all(batchPromises);

    // Small delay between batches to be respectful to the server
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Generate summary
  console.log("\n📊 SUMMARY:");
  console.log(`Total URLs checked: ${results.total}`);
  console.log(`✅ Accessible: ${results.accessible}`);
  console.log(`❌ Inaccessible: ${results.inaccessible}`);
  console.log(
    `📈 Success rate: ${((results.accessible / results.total) * 100).toFixed(
      2
    )}%`
  );

  if (results.errors.length > 0) {
    console.log(`\n🚨 Errors encountered: ${results.errors.length}`);
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. Page ${error.page}: ${error.error}`);
    });
  }

  // Save detailed results to JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(
    process.cwd(),
    "url-check-results",
    `url-check-${timestamp}.json`
  );

  // Create directory if it doesn't exist
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to: ${outputPath}`);

  // Return summary for programmatic use
  return {
    summary: {
      total: results.total,
      accessible: results.accessible,
      inaccessible: results.inaccessible,
      successRate: (results.accessible / results.total) * 100,
    },
    details: results.details,
    errors: results.errors,
  };
}

/**
 * Quick check function that returns only the summary
 */
async function quickCheck() {
  console.log("🔍 Quick image URL accessibility check...\n");

  let accessible = 0;
  let total = chunkedData.length;

  for (const item of chunkedData) {
    console.log(`Checking page ${item.page}: ${item.image_data_url}`);
    try {
      const response = await axios.head(item.image_data_url, {
        timeout: 5000,
        validateStatus: (status) => true,
      });

      if (
        response.status === 200 &&
        response.headers["content-type"]?.startsWith("image/")
      ) {
        accessible++;
      }
    } catch (error) {
      // Count as inaccessible
    }
  }

  const successRate = (accessible / total) * 100;
  console.log(
    `✅ Accessible: ${accessible}/${total} (${successRate.toFixed(2)}%)`
  );

  return { accessible, total, successRate };
}

// Export functions for use in other modules
export { checkImageUrls, quickCheck };

// Run the check if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || "full";

  if (mode === "quick") {
    quickCheck().catch(console.error);
  } else {
    checkImageUrls().catch(console.error);
  }
}
