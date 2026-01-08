const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

/* ===== CONFIG ===== */
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

const INTEREST_PERCENT = 10;

/* ===== DYNAMIC PRICES (UPDATED DAILY) ===== */

let DATA_PLANS = {
  MTN: { "1GB": 1000, "2GB": 1900, "5GB": 4500 },
  Airtel: { "1GB": 950, "2GB": 1800, "5GB": 4300 },
  Glo: { "1GB": 900, "2GB": 1700, "5GB": 4000 }
};

let TIKTOK_COINS = {
  "350 Coins": 4500,
  "700 Coins": 9000,
  "1400 Coins": 18000
};

let orders = [];

/* ===== HELPERS ===== */
const addInterest = amt => Math.ceil(amt + (amt * INTEREST_PERCENT) / 100);

/* ================= HOME ================= */
app.get("/", (req, res) => {
  res.send(`
<script>
const DATA=${JSON.stringify(DATA_PLANS)};
const TIKTOK=${JSON.stringify(TIKTOK_COINS)};
const INTEREST=${INTEREST_PERCENT};

function loadService(){
  const s=service.value;
  networkDiv.style.display = s==="Data"?"block":"none";
  product.innerHTML="<option>Select</option>";
  price.innerText="";
  if(s==="TikTok"){
    for(let c in TIKTOK) product.innerHTML+=\`<option>\${c}</option>\`;
  }
}

function loadPlans(){
  product.innerHTML="<option>Select</option>";
  for(let p in DATA[network.value]) product.innerHTML+=\`<option>\${p}</option>\`;
}

function calc(){
  let base=0;
  if(service.value==="Data") base=DATA[network.value][product.value];
  if(service.value==="TikTok") base=TIKTOK[product.value];
  if(base){
    let total=Math.ceil(base+(base*INTEREST)/100);
    amount.value=total;
    price.innerText="Pay ₦"+total;
  }
}
</script>

<style>
body{background:#0f2027;color:#fff;font-family:sans-serif;display:flex;justify-content:center}
.card{background:#111;padding:25px;margin-top:40px;border-radius:20px;width:95%;max-width:420px}
select,input,button{width:100%;padding:12px;margin-top:10px;border-radius:8px;border:none}
button{background:#00ffcc;font-weight:bold}
</style>

<div class="card">
<h2>CoinTop</h2>

<form method="POST" action="/checkout">
<select id="service" name="service" onchange="loadService()" required>
<option value="">Select Service</option>
<option>Data</option>
<option>TikTok</option>
</select>

<div id="networkDiv" style="display:none">
<select id="network" name="network" onchange="loadPlans()" required>
<option value="">Network</option>
<option>MTN</option><option>Airtel</option><option>Glo</option>
</select>
</div>

<select id="product" name="product" onchange="calc()" required></select>

<input name="user" placeholder="Phone / TikTok Username" required>
<input type="hidden" id="amount" name="amount">

<p id="price"></p>
<button>Proceed</button>
</form>
</div>
`);
});

/* ================= CHECKOUT ================= */
app.post("/checkout", async (req, res) => {
  const o={id:Date.now(),...req.body};
  orders.push(o);

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
    chat_id:TELEGRAM_CHAT_ID,
    text:`🆕 CoinTop Order\n${o.service}\n${o.product}\n₦${o.amount}\n${o.user}`
  }).catch(()=>{});

  res.send(`<h3>Send ₦${o.amount}</h3>
<p>Damilola Fadiora<br>Kuda MFB<br>2035470845</p>`);
});

/* ================= ADMIN PRICE UPDATE ================= */
app.get("/admin/:secret", (req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");

  res.send(`
<h2>Update Prices</h2>
<form method="POST">
<h3>MTN 1GB</h3><input name="mtn1" value="${DATA_PLANS.MTN["1GB"]}">
<h3>TikTok 350 Coins</h3><input name="t350" value="${TIKTOK["350 Coins"]}">
<button>Update</button>
</form>
`);
});

app.post("/admin/:secret",(req,res)=>{
  if(req.params.secret!==ADMIN_SECRET) return res.send("Unauthorized");

  DATA_PLANS.MTN["1GB"]=Number(req.body.mtn1);
  TIKTOK["350 Coins"]=Number(req.body.t350);

  res.send("Prices updated ✅");
});

app.listen(PORT,()=>console.log("CoinTop running"));
