// SPDX-License-Identifier: AGPL-3.0-or-later\
pragma solidity 0.7.5;

import './interfaces/IERC20.sol';

import './libraries/SafeMath.sol';

contract FlyzCirculatingSupply {
    using SafeMath for uint256;

    bool public isInitialized;

    address public FLZ;
    address public owner;
    address[] public nonCirculatingFLZAddresses;

    constructor(address _owner) {
        owner = _owner;
    }

    function initialize(address _flz) external returns (bool) {
        require(msg.sender == owner, 'caller is not owner');
        require(isInitialized == false);

        FLZ = _flz;

        isInitialized = true;

        return true;
    }

    function FLZCirculatingSupply() external view returns (uint256) {
        uint256 _totalSupply = IERC20(FLZ).totalSupply();

        uint256 _circulatingSupply = _totalSupply.sub(getNonCirculatingFLZ());

        return _circulatingSupply;
    }

    function getNonCirculatingFLZ() public view returns (uint256) {
        uint256 _nonCirculatingFLZ;

        for (
            uint256 i = 0;
            i < nonCirculatingFLZAddresses.length;
            i = i.add(1)
        ) {
            _nonCirculatingFLZ = _nonCirculatingFLZ.add(
                IERC20(FLZ).balanceOf(nonCirculatingFLZAddresses[i])
            );
        }

        return _nonCirculatingFLZ;
    }

    function setNonCirculatingFLZAddresses(
        address[] calldata _nonCirculatingAddresses
    ) external returns (bool) {
        require(msg.sender == owner, 'Sender is not owner');
        nonCirculatingFLZAddresses = _nonCirculatingAddresses;

        return true;
    }

    function transferOwnership(address _owner) external returns (bool) {
        require(msg.sender == owner, 'Sender is not owner');

        owner = _owner;

        return true;
    }
}
