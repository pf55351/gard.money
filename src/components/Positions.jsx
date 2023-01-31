import React, { useState, useEffect, useContext } from "react";
import { useDispatch } from "react-redux";
import { microalgosToAlgos } from "algosdk";
import styled, { css } from "styled-components";
import { getCDPs, getPrice, calcRatio, closeCDP, goOnlineCDP } from "../transactions/cdp";
import { getWalletInfo, handleTxError } from "../wallets/wallets";
import { Slider, ThemeProvider } from "@mui/material";
import { ThemeContext } from "../contexts/ThemeContext";
import Details from "./Details";
import PrimaryButton from "./PrimaryButton";
import TextButton from "./TextButton";
import PageToggle from "./PageToggle";
import BorrowMore from "./BorrowMore";
import SupplyMore from "./SupplyMore";
import RepayPosition from "./RepayPosition";
import { setAlert } from "../redux/slices/alertSlice";
import LoadingOverlay from "./LoadingOverlay";
import { ids } from "../transactions/ids";
import { device, size } from "../styles/global";
import "../styles/mobile.css";
import { isMobile } from "../utils"
import Modal from "../components/Modal";
import {CancelButton, CancelButtonText} from "../pages/GovernContent"

const axios = require("axios");

export async function getAlgoGovAPR() {
  let response;
  try {
    response = await axios.get(
      "https://governance.algorand.foundation/api/periods/statistics/",
    );
  } catch (ex) {
    response = null;
    console.log(ex);
  }
  if (response) {
    const APR = (
      (parseInt(response["data"]["periods"][0].algo_amount_in_reward_pool) /
        parseInt(response["data"]["periods"][0].total_committed_stake)) *
      400
    ).toFixed(2);
    return APR;
  }
  return null;
}

const mGardToGard = (num) => {
  return num / 1000000;
};

function _CDPsToList(CDPList) {
  let res = [];
  for (const [cdpID, value] of Object.entries(CDPList)) {
    if (value["state"] == "opened") {
      res.push({
        id: cdpID,
        liquidationPrice: (
          (1.15 * value["debt"]) /
          value["collateral"]
        ).toFixed(4),
        collateral: value["collateral"],
        collateralType: value["collateralType"],
        debt: value["debt"],
        asaID: value["asaID"],
        committed: value.hasOwnProperty("committed") ? value["committed"] : 0,
      });
    }
  }
  return res;
}

export function CDPsToList() {
  const CDPs = getCDPs();
  let res = [];
  if (getWalletInfo() && CDPs[getWalletInfo().address] != null) {
    const accountCDPs = CDPs[getWalletInfo().address];
    if (accountCDPs[0] != null) {
      res = res.concat(_CDPsToList(accountCDPs[0]));
    }
    if (accountCDPs[ids.asa.galgo] != null) {
      res = res.concat(_CDPsToList(accountCDPs[ids.asa.galgo]));
    }
  }
  if (res.length == 0) {
    res = dummyCDPs;
  }
  return res;
}
export const dummyCDPs = [
  {
    id: "N/A",
    liquidationPrice: 0,
    collateral: 0,
    debt: 0,
  },
];

function displayRatio() {
  return calcRatio(algosToMAlgos(getCollateral()), getMinted(), 0, true); // TODO: Need to set the ASA ID Properly
}

function mAlgosToAlgos(num) {
  return num / 1000000;
}
function algosToMAlgos(num) {
  return num * 1000000;
}

function displayLiquidationPrice() {
  return "$" + ((1.15 * getMinted()) / getCollateral()).toFixed(4);
}

function getMinted() {
  if (
    document.getElementById("borrowMore") == null ||
    isNaN(parseFloat(document.getElementById("borrowMore").value))
  ) {
    return null;
  }
  return parseFloat(document.getElementById("borrowMore").value);
}

function getField(id){
  if (
    document.getElementById(id) == null
  ) {
    return null;
  }
  return document.getElementById(id).value;
}

function getCollateral() {
  if (
    document.getElementById("addCollateral") == null ||
    isNaN(parseFloat(document.getElementById("addCollateral").value))
  ) {
    return null;
  }
  return parseFloat(document.getElementById("addCollateral").value);
}

function recalcDetails() {
  displayLiquidationPrice();
  getMinted();
  getCollateral();
  displayRatio();
}


export default function Positions({cdp, maxGARD, maxSupply}) {
  const [mobile, setMobile] = useState(isMobile());

    const dispatch = useDispatch();
    const {theme} = useContext(ThemeContext);
    const [price, setPrice] = useState(0)
    const [supplyPrice, setSupplyPrice] = useState(0)
    const [apr, setAPR] = useState(0)
    const [cAlgos, setCollateral] = useState("");
    const [mGARD, setGARD] = useState("")
    const [minted, setMinted] = useState("")
    const loadedCDPs = CDPsToList().sort(function  (a, b) {
      let r1 = parseInt(calcRatio(a.collateral, a.debt / 1e6,a.asaID,true,).slice(0,-1))
      let r2 = parseInt(calcRatio(b.collateral, b.debt / 1e6,b.asaID,true,).slice(0,-1))
      return r1 - r2
    });
    const [currentCDP, setCurrentCDP] = useState(null);
    const [collateralType, setCollateralType] = useState("ALGO")
    const [selectedTab, setSelectedTab] = useState("one");
    const [manageUpdate, setManageUpdate] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalCanAnimate, setModalCanAnimate] = useState(false);
    const [personal, setPersonal] = useState(false)
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState(null);
    const typeCDP = {
      galgo: "gALGO",
      algo: "ALGO"
    }

    useEffect(() => {
      setMobile(isMobile())
    }, [])

  useEffect(async () => {
    setAPR(await getAlgoGovAPR());
  }, []);

  useEffect(() => {
    let type;
    if (currentCDP !== null) {
      type = currentCDP.collateralType;
      if (type === "galgo") {
        setCollateralType("gALGO");
      } else if (type === "algo") {
        setCollateralType("ALGO");
      }
    }
  }, [currentCDP]);

  var sessionStorageSetHandler = function (e) {
    setLoadingText(JSON.parse(e.value));
  };

  document.addEventListener("itemInserted", sessionStorageSetHandler, false);

  const tabs = {
    one: "Borrow More",
    two: "Supply More",
    three: "Repay Position",
    four: "Close Position",
  };
  useEffect(async () => {
    setAPR(await getAlgoGovAPR());
    setPrice(await getPrice());
  }, []);

  useEffect(() => {
    setSupplyPrice(price);
  }, [price]);

  useEffect(() => {
    if (manageUpdate) {
      recalcDetails();
      setManageUpdate(!manageUpdate);
    }
  }, [manageUpdate]);

  return (
    <PositionContainer>
      {loading ? (
        <LoadingOverlay
          text={loadingText}
          close={() => {
            setLoading(false);
          }}
        />
      ) : (
        <></>
      )}
      <Container>
        {loadedCDPs.length && loadedCDPs.length > 0
          ? loadedCDPs.map((cdp, idx) => {
              return (
                <Position mobile={mobile} key={cdp.id.toString() + idx.toString()}>
                  <Modal
                  title={"Secure the Algorand Blockchain"}
                  subtitle={"Associate the Algos in your CDP with a consensus node"}
                  close={() => setModalVisible(false)}
                  animate={modalCanAnimate}
                  visible={modalVisible}
                >
                  {(
                      <div>
                        <div style={{marginBottom: 10, display: "flex", flexDirection: "row"}}>
                        <PrimaryButton
                          blue={true}
                          text="Use GARD Node"
                          onClick={async () => {
                            setLoading(true);
                            try {
                              let res = await goOnlineCDP(parseInt(cdp.id), "hi", "test", 0, 1, 2);
                              if (res.alert) {
                                dispatch(setAlert(res.text));
                              }
                            } catch (e) {
                              handleTxError(e, "Error going Online");
                            }
                            setLoading(false);
                            // setRefresh(refresh + 1);
                          }}
                        /><PrimaryButton
                        blue={true}
                        text="I run my own"
                        onClick={() => {
                          setPersonal(!personal);
                        }}
                      /></div>
                      {personal ? (<>
                        <NodeInput
                        autoComplete="off"
                        display="none"
                        placeholder={"Vote Key"}
                        type='text'
                        id="voteKey"
                        />
                        <NodeInput
                        autoComplete="off"
                        display="none"
                        placeholder={"Selection Key"}
                        type='text'
                        id="selKey"
                        />
                        <NodeInput
                        autoComplete="off"
                        display="none"
                        placeholder={"State Proof Key"}
                        type='text'
                        id="sprfKey"
                        />
                        <NodeInput
                        autoComplete="off"
                        display="none"
                        placeholder={"Vote First Round"}
                        type='number'
                        min="0.00"
                        id="voteFirst"
                        />
                        <NodeInput
                        autoComplete="off"
                        display="none"
                        placeholder={"Vote Last Round"}
                        type='number'
                        min="0.00"
                        id="voteLast"
                        />
                      <div style={{ display: "flex", flexDirection: "row", marginBottom: 5}}>
                        <PrimaryButton
                          blue={true}
                          text="Secure with personal node"
                          onClick={async () => {
                            setLoading(true);
                            try {
                              let res = await goOnlineCDP(parseInt(cdp.id), getField("voteKey"), getField("selKey"), getField("sprfKey"), parseInt(getField("voteFirst")), parseInt(getField("voteLast")));
                              if (res.alert) {
                                dispatch(setAlert(res.text));
                              }
                            } catch (e) {
                              handleTxError(e, "Error going Online");
                            }
                            setLoading(false);
                            // setRefresh(refresh + 1);
                          }}
                        />
                        
                        <CancelButton style={{ marginLeft: 30 }} onClick={() => setModalVisible(false)}>
                          <CancelButtonText>
                            Cancel
                          </CancelButtonText>
                        </CancelButton>
                    </div>
                    </>) : <></>}
                  </div>
                  )}
                </Modal>
                <PositionBox mobile={mobile}>
                  {!cdp.asaID ? <PrimaryButton
                            text="Node Consensus"
                            positioned={false}
                            blue={true}
                            onClick={() => {
                              // setLoading(true);
                              setModalVisible(true)
                              // setLoading(false);
                            }}
                          /> : <></>}
                <PositionInfo mobile={mobile}>
                    <PositionSupplyBorrow mobile={mobile} className="m_positions_item m-positions_box_1">
                      <b className="m-positions_row_1">Your Position</b>
                      <Sply mobile={mobile} >
                        Supplied:
                        <div style={{ display: "flex" }}>
                          <div className="currency_flow">
                            {microalgosToAlgos(cdp.collateral).toFixed(2)}
                          </div>{" "}
                          {typeCDP[cdp.collateralType]}
                        </div>
                      </Sply>
                      <Brr mobile={mobile}>
                        Borrowed:
                        <div style={{ display: "flex" }}>
                          <div className="currency_flow">
                            {mGardToGard(cdp.debt).toFixed(2)}
                          </div>{" "}
                          GARD
                        </div>
                      </Brr>
                    </PositionSupplyBorrow>
                    <div
                      className="m_positions_item m-positions_box_2"
                      style={{ display: "flex", flexDirection: "column" }}
                    >
                      <div>
                        <b className="m-positions_row_2">Governance Rewards</b>
                      </div>
                      <APRBox>
                        <div>APR: </div>
                        <span style={{ color: "#01d1ff", marginLeft: 8 }}>
                          {`  ` + apr}%
                        </span>
                      </APRBox>
                    </div>
                    <div
                      className="m_positions_item m-positions_box_3"
                      style={{ display: "flex", flexDirection: "column" }}
                    >
                      <b className="m-positions_row_3">CDP Health</b>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          {" "}
                          Health{" "}
                          {`(${calcRatio(
                            cdp.collateral,
                            cdp.debt / 1e6,
                            cdp.asaID,
                            true,
                          )})`}{" "}
                        </div>
                        <div>
                          Liquidation Price ($
                          {(
                            (1.15 * mAlgosToAlgos(cdp.debt)) /
                            mAlgosToAlgos(cdp.collateral)
                          ).toFixed(4)}
                          )
                        </div>
                      </div>
                      <ThemeProvider theme={theme}>
                        <Slider
                          color={
                            calcRatio(cdp.collateral, cdp.debt / 1e6, false) <
                            140
                              ? "danger"
                              : calcRatio(
                                  cdp.collateral,
                                  cdp.debt / 1e6,
                                  cdp.asaID,
                                  false,
                                ) < 250
                              ? "moderate"
                              : "healthy"
                          }
                          min={115}
                          max={600}
                          value={calcRatio(
                            cdp.collateral,
                            cdp.debt / 1e6,
                            cdp.asaID,
                            false,
                          )}
                        />
                      </ThemeProvider>
                      <SliderRange>
                        <div>minimum: 115%</div>
                        <div>max: 600+%</div>
                      </SliderRange>
                    </div>
                  </PositionInfo>
                  </PositionBox>
                  <ManageCollapse
                    positioned={true}
                    text={
                      cdp.id + cdp.asaID === currentCDP
                        ? "Collapse"
                        : "Manage Position"
                    }
                    onClick={
                      cdp.id + cdp.asaID === currentCDP
                        ? () => {
                            setCurrentCDP(null);
                            setSelectedTab("one");
                          }
                        : () => {
                            setCurrentCDP(cdp.id + cdp.asaID);
                            setSelectedTab("one");
                          }
                    }
                  />
                  {cdp.id + cdp.asaID === currentCDP ? (
                    <ToggleContainer mobile={mobile}>
                      <PageToggle selectedTab={setSelectedTab} tabs={tabs} pageHeader={false}/>
                      {selectedTab === "one" ? (
                        <BorrowMore
                          supplyPrice={supplyPrice}
                          collateral={cAlgos}
                          mAsset={mGARD}
                          setCollateral={setCollateral}
                          minted={setGARD}
                          cdp={cdp}
                          price={price}
                          setCurrentCDP={setCurrentCDP}
                          maxMint={maxGARD}
                          apr={apr}
                          manageUpdate={setManageUpdate}
                        />
                      ) : selectedTab === "two" ? (
                        <SupplyMore
                          collateralType={cdp.collateralType}
                          supplyPrice={supplyPrice}
                          cAsset={cAlgos}
                          collateral={setCollateral}
                          minted={setMinted}
                          cdp={cdp}
                          price={price}
                          setCurrentCDP={setCurrentCDP}
                          maxSupply={maxSupply}
                          apr={apr}
                          manageUpdate={setManageUpdate}
                        />
                      ) : selectedTab === "three" ? (
                        <RepayPosition
                          cdp={cdp}
                          price={price}
                          setCurrentCDP={setCurrentCDP}
                          mobile={mobile}
                          apr={apr}
                        />
                      ) : (
                        // : selectedTab === "three" ?
                        //     <div>
                        //         <SalesHeader>
                        //             <b style={{textAlign:"left"}}>Position</b>
                        //             <b>Sell for</b>
                        //             <b style={{textAlign: "center"}}>Amount</b>
                        //             <b style={{textAlign: "center"}}>Sale Discount</b>
                        //         </SalesHeader>
                        //         <SalesInfo>
                        //             <div style={{display: "flex", flexDirection: "column", rowGap: 20}}>
                        //                 <div>Supplied: {(microalgosToAlgos(cdp.collateral)).toFixed(2)} ALGOs</div>
                        //                 <div>Borrowed: {mGardToGard(cdp.debt).toFixed(2)} GARD</div>
                        //             </div>
                        //             <PrimaryButton text="ALGO"/>
                        //             <div style={{display: "flex", flexDirection: "column", alignSelf: "center"}}>
                        //                 <Input
                        //                 autoComplete="off"
                        //                 display="none"
                        //                 placeholder={"enter amount"}
                        //                 type='number'
                        //                 min="0.00"
                        //                 id="salesPrice"
                        //                 // value={salesPrice}
                        //                 // onChange={handleSalesPrice}
                        //                 />
                        //                 <Valuation>Value: ${12.3}</Valuation>
                        //             </div>
                        //             <div style={{color: "grey", textAlign: "center"}}> 4.33%</div>
                        //         </SalesInfo>
                        //         <PrimaryButton text="List for Sale" purple={true} disabled={true} />
                        // </div>
                        <div style={{ marginTop: 40 }}>
                          <PrimaryButton
                            text="Close Position"
                            positioned={true}
                            blue={true}
                            onClick={async () => {
                              setLoading(true);
                              try {
                                let res = await closeCDP(cdp.id, cdp.asaID);
                                if (res.alert) {
                                  dispatch(setAlert(res.text));
                                }
                              } catch (e) {
                                handleTxError(e, "Error minting from CDP");
                              }
                              setLoading(false);
                              setCurrentCDP(null);
                            }}
                          />
                        </div>
                      )}
                    </ToggleContainer>
                  ) : (
                    <></>
                  )}
                </Position>
              );
            })
          : null}
      </Container>
    </PositionContainer>
  );
}

const Sply = styled.div`
  display: flex;
  margin-bottom: 20px;
  @media (${device.laptop}) {
    flex-direction: column;
  }
  @media (${device.tablet}) {
    flex-direction: row;
  }
  ${(props) => props.mobile && css`
    flex-direction: row;
  `}
`;

const Brr = styled.div`
  display: flex;
  @media (${device.laptop}) {
    flex-direction: column;
  }
  @media (${device.tablet}) {
    flex-direction: row;
  }
  ${(props) => props.mobile && css`
  flex-direction: row;

  `}
`;

const APRBox = styled.div`
  display: flex;
  @media (min-width: ${size.tablet}) {
    padding-top: 10px;
  }
`;

const ManageCollapse = styled(TextButton)`
  @media (${device.mobileL}) {
    transform: scale(0.9) translateY(-30px);
  }
  @media (${device.mobileM}) {
    transform: scale(0.85) translateY(-35px);
  }
  @media (${device.mobileS}) {
    transform: scale(0.8) translateY(-40px);
  }
`;

const ToggleContainer = styled.div`
  @media (${device.tablet}) {
    transform: scale(0.9);
    max-width: 90vw;
  }
  ${(props) => props.mobile && css`
  transform: scale(0.9);
    max-width: 90vw;

  `}
  @media (${device.mobileL}) {
    display: flex;
    flex-direction: column;
  }
  @media (${device.mobileM}) {
    margin-top: -40px;
  }
`;

const PositionSupplyBorrow = styled.div`
  display: flex;
  flex-direction: column;
  @media (min-width: ${size.tablet}) {
  }
  ${(props) => !props.mobile && css`


  `}

  @media (${device.tablet}) {
    row-gap: 6px;
    margin: 6px 0px 6px 0px;
    border-radius: 10px;
    padding: 20px;
  }
  ${(props) => props.mobile && css`
  row-gap: 6px;
    margin: 6px 0px 6px 0px;
    border-radius: 10px;
    padding: 20px;

  `}
`;

const PositionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
  /* flex: 1 1 0px; */
  width: auto;
`;

const Header = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 33%);
  justify-content: center;
  align-content: center;
  text-align: left;
  font-size: 20px;
  margin-top: 50px;
  ${(props) => props.mobile && css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-items: flex-start;
    border: 1px solid white;
    width: 400px;
    border-radius: 10px;
    padding: 8px;
  `}
  @media (${device.tablet}) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-items: flex-start;
    border: 1px solid white;
    width: 400px;
    border-radius: 10px;
    padding: 8px;
  }
  @media (${device.mobileL}) {
    width: 350px;
  }
  @media (${device.mobileM}) {
    width: 280px;
  }
  @media (${device.mobileS}) {
    width: 240px;
  }
`;
const SalesHeader = styled.div`
  display: grid;
  grid-template-columns: 30% 20% 20% 20%;
  justify-content: center;
  align-content: center;
  text-align: center;
  font-size: 16px;
  margin-top: 50px;
  margin-bottom: 20px;
`;
const SalesInfo = styled.div`
  display: grid;
  grid-template-columns: 30% 20% 20% 20%;
  justify-content: center;
  align-content: center;
  align-items: center;
  background: rgba(13, 18, 39, 0.75);
  border-radius: 10px;
  font-size: 18px;
  padding: 40px 0px 40px;
  margin-bottom: 20px;
`;

const Container = styled.div`
  margin: 10px 0px 40px;
`;

const Position = styled.div`
  position: relative;
  @media (${device.tablet}) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  ${(props) => props.mobile && css`
  display: flex;
    flex-direction: column;
    align-items: center;
  `}
`;
const PositionInfo = styled.div`
  display: grid;
  padding-top: 10px;
  grid-template-columns: repeat(3, 30%);
  justify-content: center;
  align-content: center;
  font-size: 18px;
  @media (${device.tablet}) {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 10px 4px 10px;
    max-width: 432px;
  }
  ${(props) => props.mobile && css`
  display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 10px 4px 10px;
    max-width: 432px;
  `}
  @media (${device.mobileM}) {
    transform: scale(0.9);
  }
  @media (${device.mobileS}) {
    transform: scale(0.85);
  }
`;
const PositionBox = styled.div`
  border: 1px solid white;
  background: rgba(13, 18, 39, 0.75);
  padding: 20px 0px 40px;
  border-radius: 10px;
  ${(props) => props.mobile && css`
  padding-top: 10px;
  width: 90%;
  `}
`
const SliderRange = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
`;
const NodeInput = styled.input`
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 10px;
  width: 80%;
  height: 60%;
  color: white;
  text-decoration: none;
  border: 2px solid white;
  opacity: 100%;
  font-size: 20px;
  background: none;
  &:focus {
    outline-width: 0;
  }
`;
const Valuation = styled.div`
  margin-left: 25px;
  margin-top: 3px;
  font-size: 12px;
  color: #999696;
  text-align: center;
`;
