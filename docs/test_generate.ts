async function main() {
  const url = "http://[::1]:3001/api/brand-dna/generate"
  console.log(`Sending POST to ${url} for ID 23...`)
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 23 }),
    })

    console.log(`Status: ${res.status} ${res.statusText}`)
    const text = await res.text()
    console.log("Response Body (first 500 chars):")
    console.log(text.slice(0, 500))
  } catch (e) {
    console.error("Fetch failed:", e)
  }
}

main()
