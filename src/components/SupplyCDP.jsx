import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import styled, { css } from "styled-components";
import Effect from "./Effect";
import ToolTip from "./ToolTip";
import PrimaryButton from "./PrimaryButton";
import { addCollateral } from "../transactions/cdp";
import {
  handleTxError,
  getWalletInfo,
  updateWalletInfo,
} from "../wallets/wallets";
import { setAlert } from "../redux/slices/alertSlice";
import LoadingOverlay from "./LoadingOverlay";

function mAlgosToAlgos(num) {
  return num / 1000000;
}

export default function SupplyCDP({
  collateral,
  cdp,
  price,
  setCurrentCDP,
  maxSupply,
  manageUpdate,
  apr,
}) {
  const walletAddress = useSelector((state) => state.wallet.address);
  const [balance, setBalance] = useState(0);
  const [supplyLimit, setSupplyLimit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(null);
  const [commitChecked, setCommitChecked] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [additionalSupply, setAdditionalSupply] = useState("");

  const handleCheckboxChange = () => {
    setCommitChecked(!commitChecked);
  };

  const handleAddSupply = (event) => {
    manageUpdate(true)
    setAdditionalSupply(
      event.target.value === "" ? "" : Number(event.target.value),
    );
    collateral(event.target.value === "" ? "" : Number(event.target.value));
  };

  const handleMaxSupply = (event) => {
    manageUpdate(true)
    collateral(Number(maxSupply))
    setAdditionalSupply(Number(maxSupply))
  }

  useEffect(async () => {
    await updateWalletInfo();
    let wallet = await getWalletInfo();
    if (wallet !== null) {
      setBalance(mAlgosToAlgos(getWalletInfo()["min-balance"]).toFixed(3));
      console.log("AAAAA", getWalletInfo());
    }
  }, []);

  useEffect(() => {
    setSupplyLimit(balance);
  }, [balance]);

  useEffect(() => {

  }, [additionalSupply])

  useEffect(() => {
    if (!walletAddress) navigate("/");
  }, [walletAddress]);

  var supplyDetails = [
    {
      title: "Supply Limit",
      val: `${supplyLimit} ALGOs`,
      hasToolTip: true,
    },
  ];

  var sessionStorageSetHandler = function (e) {
    setLoadingText(JSON.parse(e.value));
  };

  document.addEventListener("itemInserted", sessionStorageSetHandler, false);

  return (
    <div>
      {loading ? <LoadingOverlay text={loadingText} close={()=>{setLoading(false);}}/> : <></>}
      <Container>
        <SubContainer>
          <Background>
            <Title>Supply More ALGO</Title>
            <InputContainer>
              <div style={{ display: "flex" }}>
                <Input
                  autoComplete="off"
                  display="none"
                  placeholder={"enter amount"}
                  type="number"
                  min="0.00"
                  id="addCollateral"
                  value={additionalSupply}
                  onChange={handleAddSupply}
                />
                <MaxButton onClick={handleMaxSupply}>
                  <ToolTip
                    toolTip={"+MAX"}
                    toolTipText={"Click to lend maximum amount"}

                  />
                </MaxButton>
              </div>
              <Valuation>
                $Value: ${(additionalSupply * price).toFixed(2)}
              </Valuation>
              <InputDetails>
                {supplyDetails.length && supplyDetails.length > 0
                  ? supplyDetails.map((d) => {
                      return (
                        <Item key={d.title}>
                          <Effect
                            title={d.title}
                            val={d.val}
                            hasToolTip={d.hasToolTip}
                          ></Effect>
                        </Item>
                      );
                    })
                  : null}
                  <label
                  style={{
                    display: "flex",
                    alignContent: "center",
                  }}
                >
                   <InputTitle>
                  Commit to governance
                </InputTitle>
                      <input
                        type={"checkbox"}
                        onChange={handleCheckboxChange}
                      />
                </label>
              </InputDetails>
            </InputContainer>
          </Background>
          <PrimaryButton
            blue={true}
            positioned={true}
            text="Supply More"
            onClick={async () => {
              setLoading(true);
              try {
                let res = await addCollateral(cdp.id, additionalSupply);
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
        </SubContainer>
      </Container>
    </div>
  );
}
const Container = styled.div`
  /* display: grid;
    grid-template-columns: repeat(1, 69%);
    column-gap: 2%;
    position: relative; */
  display: flex;
  justify-content: center;
  top: -40px;
`;
const Text = styled.text`
  //
`

const SubContainer = styled.div`
  position: relative;
  margin-bottom: 30px;
`;
const Background = styled.div`
  margin-top: 30px;
  background: #1b2d65;
  border-radius: 10px;
`;
const Title = styled.div`
  display: flex;
  justify-content: center;
  text-align: center;
  padding: 20px 0px 20px;
`;

const InputContainer = styled.div`
  background: rgba(13, 18, 39, 0.75);
  border-radius: 10px;
  border: 1px solid #80edff;
`;

const InputDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 40%);
  row-gap: 30px;
  justify-content: center;
  padding: 30px 0px 30px;
  border-radius: 10px;
`;

const InputTitle = styled.text`
  font-weight: bold;
  font-size: 16px;
`;

const Item = styled.div`
  display: flex;
  flex-direction: column;
  font-size: 14px;
`;
const MaxButton = styled.button`
  color: #01d1ff;
  background: none;
  border: none;
  margin-top: 50px;
  cursor: pointer;
  font-size: 12px;
`;
const Valuation = styled.div`
  margin-left: 25px;
  margin-top: 3px;
  font-size: 12px;
  color: #999696;
`;
const Input = styled.input`
  padding-top: 35px;
  border-radius: 0;
  height: 30px;
  width: 80%;
  color: white;
  text-decoration: none;
  border: none;
  border-bottom: 2px solid #01d1ff;
  opacity: 100%;
  font-size: 20px;
  background: none;
  margin-left: 25px;
  &:focus {
    outline-width: 0;
  }
`;
