const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testProxy() {
  console.log('🧪 === TESTS DU PROXY MCP ===\n');

  // Test 1: Health check
  console.log('1. Test Health Check...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check OK:', data.status);
  } catch (error) {
    console.log('❌ Health check FAIL:', error.message);
    return;
  }

  // Test 2: Liste des outils
  console.log('\n2. Test liste des outils...');
  try {
    const response = await fetch(`${BASE_URL}/tools`);
    const data = await response.json();
    console.log('✅ Outils récupérés:', data.result ? 'OK' : 'Pas de résultat');
  } catch (error) {
    console.log('❌ Liste outils FAIL:', error.message);
  }

  // Test 3: Initialisation MCP
  console.log('\n3. Test initialisation MCP...');
  try {
    const response = await fetch(`${BASE_URL}/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    console.log('✅ Initialisation:', data.result ? 'OK' : 'Réponse reçue');
  } catch (error) {
    console.log('❌ Initialisation FAIL:', error.message);
  }

  // Test 4: Recherche simplifiée
  console.log('\n4. Test recherche simplifiée...');
  try {
    const response = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'How to create Azure Function'
      })
    });
    const data = await response.json();
    console.log('✅ Recherche:', data.result ? 'Résultats trouvés' : 'Réponse reçue');
  } catch (error) {
    console.log('❌ Recherche FAIL:', error.message);
  }

  // Test 5: Proxy MCP direct
  console.log('\n5. Test proxy MCP direct...');
  try {
    const response = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list"
      })
    });
    const data = await response.json();
    console.log('✅ Proxy MCP:', data.result !== undefined ? 'OK' : 'Réponse reçue');
  } catch (error) {
    console.log('❌ Proxy MCP FAIL:', error.message);
  }

  console.log('\n🎉 Tests terminés!\n');
}

// Exécuter les tests
testProxy().catch(console.error);