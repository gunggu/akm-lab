// Instructor-only lease discussion calculations. Never import this module from public assets.
const amount=n=>Math.round(n);
const line=(date,debit,credit,value,reason)=>({date,debit,credit,amount:amount(value),reason});
export function buildInstructorGuide(c){
 const rent=c.rent,r=c.rate,n=c.years,begin=c.due==="beginning",finance=c.leaseType==="finance";
 const pv=rent*((1-Math.pow(1+r,-n))/r)*(begin?1+r:1);
 const cash0=begin?rent:0,opening=pv-cash0,interest=opening*r;
 const receipt1=begin?0:rent,liability1=opening+interest-receipt1;
 const depROU=pv/n,assetEnd=pv-depROU;
 const operatingDep=c.cost/c.life,lessorCarrying=c.cost-operatingDep;
 const manufacturerProfit=finance?pv-c.cost:0;
 const journals={lessee:[
  line("1 Jan 2027","Right-of-use asset","Lease liability",pv,"Recognize the ROU asset and present value of rentals."),
  ...(begin?[line("1 Jan 2027","Lease liability","Cash",cash0,"Payment at commencement reduces the lease liability immediately.")]:[]),
  line("31 Dec 2027","Interest expense","Lease liability",interest,"Apply the effective-interest rate to the liability outstanding after any initial payment."),
  ...(!begin?[line("31 Dec 2027","Lease liability","Cash",rent,"The year-end payment settles interest and principal; combine with the interest accrual above.")]:[]),
  line("31 Dec 2027","Depreciation expense—ROU","Accumulated depreciation—ROU",depROU,"Straight-line over the lease term; no ownership transfer or purchase option.")
 ],lessor:finance?[
  line("1 Jan 2027","Net investment in lease","Sales revenue",pv,"Manufacturer/dealer lessor recognizes finance lease receivable and sales revenue."),
  line("1 Jan 2027","Cost of sales","Inventory / equipment",c.cost,"Derecognize manufacturer's carrying cost; there is no unguaranteed residual in these finance cases."),
  ...(begin?[line("1 Jan 2027","Cash","Net investment in lease",cash0,"Collect the first installment at commencement.")]:[]),
  line("31 Dec 2027","Net investment in lease","Finance income",interest,"Interest on the net investment outstanding after any initial receipt."),
  ...(!begin?[line("31 Dec 2027","Cash","Net investment in lease",rent,"Collect Year 1 installment; separate income is accrued above.")]:[])
 ]:[
  line("31 Dec 2027","Cash","Lease income",rent,"Recognize operating rental income, assuming annual cash receipt at year-end."),
  line("31 Dec 2027","Depreciation expense","Accumulated depreciation—equipment",operatingDep,"Retain the underlying asset and depreciate over its useful life.")
 ]};
 const schedule=[];let outstanding=opening;
 for(let year=1;year<=n;year++){
   const periodInterest=outstanding*r;
   const payment=begin?(year<n?rent:0):rent;
   const closing=outstanding+periodInterest-payment;
   schedule.push({year,opening:amount(outstanding),interest:amount(periodInterest),payment:amount(payment),closing:amount(Math.max(0,closing))});
   outstanding=closing;
 }
 const rationale=finance
 ? "The lease term uses most of the asset’s economic life and transfers substantially all risks and rewards. A manufacturer/dealer lessor recognizes selling profit at commencement and finance income subsequently. The lessee recognizes an ROU asset and lease liability."
 : "The short lease term and significant retained residual-value exposure support operating-lease classification for the lessor. The equipment stays on its books. The lessee nevertheless recognizes a right-of-use asset and lease liability.";
 const cautions=[
 "These are illustrative entries for the exact stated assumptions. No purchase option, residual guarantee, taxes, initial direct costs, lease incentives or non-lease components.",
 "Use cash receipt for operating lessors at Year 1 end as an explicit exercise convention. If receipts instead occur on different dates, adjust the cash and receivable entries.",
 "The lessor's estimated unguaranteed residual value is an end-of-lease economic estimate, not a lessee payment or a guaranteed cash receipt; it is relevant to risks-and-rewards classification for these operating cases.",
 "Straight-line depreciation uses zero value at the end of useful life, whereas estimated fair value at lease expiration may be different from book value.",
 "The lessee's Year 1 interest and ROU depreciation are distinct expenses; finance-lessor income is distinct from manufacturer selling profit."
 ];
 if(begin)cautions.push("For an annuity due, the first installment is paid on 1 January 2027; the last installment occurs on 1 January of the final lease year. There is no cash rental at 31 December 2027.");
 if(!finance)cautions.push("Operating lease lessors should not book sales revenue or a finance lease receivable; the lessee should not use the lessor's operating classification as an exemption.");
 return {id:c.id,manufacturer:c.brand,lessee:c.lesseeCompany,asset:c.asset,classification:finance?"Finance lease (lessor)":"Operating lease (lessor)",rationale,assumptions:{fairValue:c.fv,carryingCost:c.cost,rental:rent,annualRate:r,years:n,usefulLife:c.life,paymentTiming:c.due,unguaranteedResidual:c.residual},amounts:{pvPayments:amount(pv),cashAtCommencement:amount(cash0),liabilityAfterCommencement:amount(opening),year1Interest:amount(interest),year1EndLiability:amount(liability1),rouAssetAtCommencement:amount(pv),rouDepreciationYear1:amount(depROU),rouAssetAtYear1End:amount(assetEnd),lessorRevenue:finance?amount(pv):null,lessorCostOfSales:finance?c.cost:null,lessorSellingProfit:finance?amount(manufacturerProfit):null,lessorFinanceIncomeYear1:finance?amount(interest):0,lessorOperatingRentalIncomeYear1:finance?null:rent,lessorDepreciationYear1:finance?null:amount(operatingDep),lessorUnderlyingAssetYear1End:finance?null:amount(lessorCarrying),lessorReceivableYear1End:finance?amount(liability1):null},journal:journals,schedule,cautions};
}
